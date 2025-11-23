# app/routers/guests.py
from __future__ import annotations

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/guests",
    tags=["Guests"],
)

# ==========================
#  Normalização de nomes
# ==========================
def normalize_name(name: str) -> str:
    """
    Normaliza nomes deixando cada palavra capitalizada.
    Ex: 'mARIA eduARDA fACIO' -> 'Maria Eduarda Facio'
    """
    if not name:
        return name

    # Capitaliza cada palavra
    return " ".join(word.capitalize() for word in name.split())


# ==========================
#  CREATE GUEST
# ==========================
@router.post("/", response_model=schemas.GuestResponse, status_code=status.HTTP_201_CREATED)
def create_guest(guest: schemas.GuestCreate, db: Session = Depends(get_db)):
    # Normaliza nome do convidado
    normalized_name = normalize_name(guest.name)

    db_guest = models.Guest(
        name=normalized_name,
        phone=guest.phone,
        email=guest.email,
    )
    db.add(db_guest)
    db.commit()
    db.refresh(db_guest)

    # Criar acompanhantes com nome normalizado
    for comp in guest.companions:
        normalized_comp_name = normalize_name(comp.name)
        new_comp = models.Companion(
            name=normalized_comp_name,
            guest_id=db_guest.id
        )
        db.add(new_comp)

    db.commit()
    db.refresh(db_guest)
    return db_guest


# ==========================
#  LIST ALL GUESTS
# ==========================
@router.get("/", response_model=List[schemas.GuestResponse])
def list_guests(db: Session = Depends(get_db)):
    return db.query(models.Guest).all()


# ==========================
#  FIND GUEST BY q
#  (ID, name, phone, email)
# ==========================
@router.get("/find", response_model=List[schemas.GuestResponse])
def find_guests(q: str, db: Session = Depends(get_db)):
    possible_id = int(q) if q.isdigit() else None

    guests = (
        db.query(models.Guest)
        .filter(
            (models.Guest.id == possible_id) |
            (models.Guest.name.ilike(f"%{q}%")) |
            (models.Guest.phone.ilike(f"%{q}%")) |
            (models.Guest.email.ilike(f"%{q}%"))
        )
        .all()
    )

    return guests


# ==========================
#  GET GUEST BY ID
# ==========================
@router.get("/{guest_id}", response_model=schemas.GuestResponse)
def get_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(404, "Convidado não encontrado.")
    return guest


# ==========================
#  UPDATE GUEST (PATCH)
# ==========================
@router.patch("/{guest_id}", response_model=schemas.GuestResponse)
def update_guest(guest_id: int, data: schemas.GuestUpdate, db: Session = Depends(get_db)):
    guest = (
        db.query(models.Guest)
        .filter(models.Guest.id == guest_id)
        .first()
    )

    if not guest:
        raise HTTPException(404, "Convidado não encontrado.")

    # Normaliza nome SE enviado
    if data.name is not None:
        guest.name = normalize_name(data.name)

    if data.phone is not None:
        guest.phone = data.phone

    if data.email is not None:
        guest.email = data.email

    db.commit()
    db.refresh(guest)
    return guest


# ==========================
#  CONFIRM & UNCONFIRM
# ==========================
@router.patch("/{guest_id}/confirm")
def confirm_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(404, "Convidado não encontrado.")

    guest.confirmed = True
    db.commit()
    return {"message": "Presença confirmada."}


@router.patch("/{guest_id}/unconfirm")
def unconfirm_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(404, "Convidado não encontrado.")

    guest.confirmed = False
    db.commit()
    return {"message": "Presença desconfirmada."}


# ==========================
#  DELETE GUEST
# ==========================
@router.delete("/{guest_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_guest(guest_id: int, db: Session = Depends(get_db)):
    guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(404, "Convidado não encontrado.")
    db.delete(guest)
    db.commit()
    return
