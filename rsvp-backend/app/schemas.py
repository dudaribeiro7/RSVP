# app/schemas.py
from __future__ import annotations

from pydantic import BaseModel, EmailStr
from typing import List, Optional


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
    email: Optional[EmailStr] = None
    companions: List[CompanionCreate] = []


class GuestCreate(GuestBase):
    pass


class GuestResponse(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[EmailStr] = None
    confirmed: bool
    companions: List[CompanionResponse]

    class Config:
        from_attributes = True


class GuestUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
