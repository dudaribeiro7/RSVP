# app/routers/photos.py
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session

import cloudinary
import cloudinary.uploader

from app.database import get_db
from app.models import Photo
from app.schemas import PhotoResponse
from app.security import require_admin


# Configuração do Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


router = APIRouter(
    prefix="/photos",
    tags=["Photos"],
)


@router.post("/upload", response_model=List[PhotoResponse], status_code=status.HTTP_201_CREATED)
async def upload_photos(
    files: List[UploadFile] = File(...),
    sender_name: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Faz upload de múltiplas fotos (até 30) para o Cloudinary e salva no banco de dados.
    """
    # Validar quantidade de arquivos
    if len(files) > 30:
        raise HTTPException(400, "Máximo de 30 fotos por envio")
    
    if len(files) == 0:
        raise HTTPException(400, "Nenhuma foto foi enviada")
    
    uploaded_photos = []
    errors = []
    
    for idx, file in enumerate(files):
        try:
            # Validar tipo de arquivo
            if not file.content_type.startswith("image/"):
                errors.append(f"Arquivo {idx + 1}: Apenas imagens são permitidas")
                continue
            
            # Validar tamanho (máximo 10MB)
            contents = await file.read()
            if len(contents) > 10 * 1024 * 1024:
                errors.append(f"Arquivo {idx + 1}: Imagem muito grande. Máximo 10MB")
                continue
            
            # Upload para o Cloudinary
            upload_result = cloudinary.uploader.upload(
                contents,
                folder="formatura-duda",
                resource_type="image",
                transformation=[
                    {"width": 1920, "height": 1920, "crop": "limit"},
                    {"quality": "auto:good"}
                ]
            )
            
            # Salvar no banco de dados
            db_photo = Photo(
                sender_name=sender_name if sender_name else None,
                photo_url=upload_result["secure_url"],
                cloudinary_public_id=upload_result["public_id"]
            )
            db.add(db_photo)
            uploaded_photos.append(db_photo)
            
        except Exception as e:
            errors.append(f"Arquivo {idx + 1}: {str(e)}")
    
    # Commit de todas as fotos que deram certo
    if uploaded_photos:
        db.commit()
        for photo in uploaded_photos:
            db.refresh(photo)
    
    # Se nenhuma foto foi enviada com sucesso
    if not uploaded_photos:
        raise HTTPException(400, f"Nenhuma foto foi enviada com sucesso. Erros: {'; '.join(errors)}")
    
    # Se algumas falharam, retorna as que deram certo mas avisa
    if errors:
        # Aqui poderíamos logar os erros, mas ainda retornamos as fotos que deram certo
        pass
    
    return uploaded_photos


@router.get("/", response_model=List[PhotoResponse])
def list_photos(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    Lista todas as fotos enviadas, ordenadas da mais recente para a mais antiga.
    """
    photos = db.query(Photo).order_by(Photo.uploaded_at.desc()).offset(skip).limit(limit).all()
    return photos


@router.get("/count")
def count_photos(db: Session = Depends(get_db)):
    """
    Retorna o total de fotos enviadas.
    """
    total = db.query(Photo).count()
    return {"total": total}


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    admin: None = Depends(require_admin)
):
    """
    Deleta uma foto (apenas admin).
    Remove do Cloudinary e do banco de dados.
    """
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(404, "Foto não encontrada")
    
    try:
        # Deletar do Cloudinary
        cloudinary.uploader.destroy(photo.cloudinary_public_id)
        
        # Deletar do banco
        db.delete(photo)
        db.commit()
        
    except Exception as e:
        raise HTTPException(500, f"Erro ao deletar foto: {str(e)}")
    
    return