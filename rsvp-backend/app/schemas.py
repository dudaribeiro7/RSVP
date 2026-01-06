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
