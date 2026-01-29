# app/routers/tables.py
from typing import List, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TableArrangement
from app.models import Guest, Companion
from app.schemas import TableCreate, TableResponse, PersonInfo
from app.security import require_admin


router = APIRouter(
    prefix="/tables",
    tags=["Tables"],
)


@router.get("/people", response_model=List[PersonInfo])
def list_people(
    db: Session = Depends(get_db),
    admin: None = Depends(require_admin)
):
    """
    Lista todas as pessoas (guests + companions confirmados) disponíveis para organizar nas mesas.
    Retorna em ordem alfabética com acompanhantes agrupados com seus convidados.
    """
    # Pegar apenas convidados confirmados (YES)
    confirmed_guests = db.query(Guest).filter(Guest.rsvp_status == "YES").all()
    
    people = []
    
    for guest in confirmed_guests:
        # Adicionar convidado
        people.append({
            "id": f"guest_{guest.id}",
            "name": guest.name,
            "type": "guest",
            "guest_name": None
        })
        
        # Adicionar acompanhantes logo após o convidado
        for companion in guest.companions:
            people.append({
                "id": f"companion_{companion.id}",
                "name": f"  ↳ {companion.name}",  # Indentação visual
                "type": "companion",
                "guest_name": guest.name
            })
    
    # Ordenar por nome do convidado principal, mantendo acompanhantes juntos
    people.sort(key=lambda x: (
        x["guest_name"] if x["guest_name"] else x["name"].strip("  ↳ ")
    ).lower())
    
    return people


@router.get("/arrangements", response_model=Dict[int, List[str]])
def get_arrangements(
    db: Session = Depends(get_db),
    admin: None = Depends(require_admin)
):
    """
    Retorna a organização atual das mesas.
    Formato: { mesa_numero: ["guest_123", "companion_456", ...] }
    """
    arrangements = db.query(TableArrangement).all()
    
    tables = {}
    for arr in arrangements:
        if arr.table_number not in tables:
            tables[arr.table_number] = []
        
        if arr.guest_id:
            tables[arr.table_number].append(f"guest_{arr.guest_id}")
        elif arr.companion_id:
            tables[arr.table_number].append(f"companion_{arr.companion_id}")
    
    return tables


@router.get("/view", response_model=Dict[int, List[str]])
def get_arrangements_public(db: Session = Depends(get_db)):
    """
    Endpoint PÚBLICO para visualização das mesas por convidados.
    Não requer autenticação.
    Formato: { mesa_numero: ["guest_123", "companion_456", ...] }
    """
    arrangements = db.query(TableArrangement).all()
    
    tables = {}
    for arr in arrangements:
        if arr.table_number not in tables:
            tables[arr.table_number] = []
        
        if arr.guest_id:
            tables[arr.table_number].append(f"guest_{arr.guest_id}")
        elif arr.companion_id:
            tables[arr.table_number].append(f"companion_{arr.companion_id}")
    
    return tables


@router.get("/people/public", response_model=List[PersonInfo])
def list_people_public(db: Session = Depends(get_db)):
    """
    Endpoint PÚBLICO - Lista pessoas para visualização das mesas.
    Não requer autenticação.
    """
    # Pegar apenas convidados confirmados (YES)
    confirmed_guests = db.query(Guest).filter(Guest.rsvp_status == "YES").all()
    
    people = []
    
    for guest in confirmed_guests:
        # Adicionar convidado
        people.append({
            "id": f"guest_{guest.id}",
            "name": guest.name,
            "type": "guest",
            "guest_name": None
        })
        
        # Adicionar acompanhantes logo após o convidado
        for companion in guest.companions:
            people.append({
                "id": f"companion_{companion.id}",
                "name": f"  ↳ {companion.name}",  # Indentação visual
                "type": "companion",
                "guest_name": guest.name
            })
    
    # Ordenar por nome do convidado principal
    people.sort(key=lambda x: (
        x["guest_name"] if x["guest_name"] else x["name"].strip("  ↳ ")
    ).lower())
    
    return people


@router.post("/arrangements", status_code=status.HTTP_201_CREATED)
def save_arrangements(
    data: Dict[int, List[str]],
    db: Session = Depends(get_db),
    admin: None = Depends(require_admin)
):
    """
    Salva a organização completa das mesas.
    Recebe: { mesa_numero: ["guest_123", "companion_456", ...] }
    """
    # Limpar arranjos anteriores
    db.query(TableArrangement).delete()
    
    # Salvar novos arranjos
    for table_number, people_ids in data.items():
        for person_id in people_ids:
            if not person_id:
                continue
                
            person_type, person_id_num = person_id.split("_")
            person_id_num = int(person_id_num)
            
            arrangement = TableArrangement(
                table_number=int(table_number),
                guest_id=person_id_num if person_type == "guest" else None,
                companion_id=person_id_num if person_type == "companion" else None
            )
            db.add(arrangement)
    
    db.commit()
    
    return {"message": "Arranjo de mesas salvo com sucesso"}


@router.delete("/arrangements", status_code=status.HTTP_204_NO_CONTENT)
def clear_arrangements(
    db: Session = Depends(get_db),
    admin: None = Depends(require_admin)
):
    """
    Limpa toda a organização de mesas.
    """
    db.query(TableArrangement).delete()
    db.commit()
    return