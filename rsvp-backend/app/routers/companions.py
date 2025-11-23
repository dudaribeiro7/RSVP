# app/routers/companions.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/companions",
    tags=["Companions"],
)

# ==========================
#  Normalização de nomes
# ==========================
def normalize_name(name: str) -> str:
    """
    Normaliza nomes deixando cada palavra capitalizada.
    Ex: 'jOÃO PAULO da silva' -> 'João Paulo Da Silva'
    """
    if not name:
        return name
    return " ".join(word.capitalize() for word in name.split())


# ==========================
#  LIST ALL COMPANIONS
# ==========================
@router.get("/", tags=["Companions"])
def list_companions(db: Session = Depends(get_db)):
    comps = db.query(models.Companion).all()
    
    return [
        {
            "companion_id": c.id,
            "companion_name": c.name,
            "guest_id": c.guest.id,
            "guest_name": c.guest.name,
        }
        for c in comps
    ]


# ==========================
#  SEARCH companions by name OR id
# ==========================
@router.get("/find")
def find_companions(q: str, db: Session = Depends(get_db)):
    possible_id = int(q) if q.isdigit() else None

    comps = (
        db.query(models.Companion)
        .filter(
            (models.Companion.id == possible_id) |
            (models.Companion.name.ilike(f"%{q}%"))
        )
        .all()
    )

    return [
        {
            "companion_id": c.id,
            "companion_name": c.name,
            "guest_id": c.guest.id,
            "guest_name": c.guest.name,
        }
        for c in comps
    ]


# ==========================
#  ADD companion to a specific guest
# ==========================
@router.post("/{guest_id}", status_code=status.HTTP_201_CREATED)
def add_companion(guest_id: int, companion: schemas.CompanionCreate, db: Session = Depends(get_db)):
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Convidado não encontrado.")

    # Normaliza o nome do acompanhante
    normalized_name = normalize_name(companion.name)

    new_comp = models.Companion(
        name=normalized_name,
        guest_id=guest_id
    )

    db.add(new_comp)
    db.commit()
    db.refresh(new_comp)

    return {
        "message": "Acompanhante adicionado.",
        "companion": {
            "id": new_comp.id,
            "name": new_comp.name,
            "guest_id": guest.id,
            "guest_name": guest.name,
        }
    }


# ==========================
#  DELETE companion
# ==========================
@router.delete("/{companion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_companion(companion_id: int, db: Session = Depends(get_db)):
    comp = (
        db.query(models.Companion)
        .filter(models.Companion.id == companion_id)
        .first()
    )

    if not comp:
        raise HTTPException(404, "Acompanhante não encontrado.")

    db.delete(comp)
    db.commit()
    return
