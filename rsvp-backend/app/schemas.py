# app/schemas.py
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class RSVPStatus(str, Enum):
    YES = "YES"
    NO = "NO"
    MAYBE = "MAYBE"


class CompanionBase(BaseModel):
    name: str


class CompanionCreate(CompanionBase):
    pass


class CompanionResponse(CompanionBase):
    id: int

    class Config:
        from_attributes = True


class GuestBase(BaseModel):
    name: str
    phone: str

    # Novo: status do RSVP
    rsvp_status: RSVPStatus

    # Novo: recado opcional
    note: Optional[str] = None

    # Mantém acompanhantes (só faz sentido quando rsvp_status == YES)
    companions: List[CompanionCreate] = []


class GuestCreate(GuestBase):
    pass


class GuestResponse(BaseModel):
    id: int
    name: str
    phone: str

    # Substitui "confirmed"
    rsvp_status: RSVPStatus

    # Novo: data/hora em que respondeu
    responded_at: datetime

    # Novo: recado
    note: Optional[str] = None

    companions: List[CompanionResponse]

    class Config:
        from_attributes = True


class GuestUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

    # Novo: permite alterar o status/recado (caso você use no admin futuramente)
    rsvp_status: Optional[RSVPStatus] = None
    note: Optional[str] = None

class PhotoUpload(BaseModel):
    sender_name: Optional[str] = None


class PhotoResponse(BaseModel):
    id: int
    sender_name: Optional[str]
    photo_url: str
    cloudinary_public_id: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class TableAssignment(BaseModel):
    guest_id: Optional[int] = None
    companion_id: Optional[int] = None


class TableCreate(BaseModel):
    table_number: int
    assignments: List[TableAssignment]


class TableResponse(BaseModel):
    id: int
    table_number: int
    guest_id: Optional[int]
    companion_id: Optional[int]

    class Config:
        from_attributes = True


class PersonInfo(BaseModel):
    id: str  # Formato: "guest_123" ou "companion_456"
    name: str
    type: str  # "guest" ou "companion"
    guest_name: Optional[str] = None  # Nome do convidado principal (para acompanhantes)
