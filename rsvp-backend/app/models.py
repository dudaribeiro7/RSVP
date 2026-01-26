# app/models.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)

    # Substitui "confirmed" por um status mais completo.
    # YES = vou, NO = não vou, MAYBE = talvez.
    rsvp_status = Column(String, nullable=False, default="YES")

    # Data/hora em que a pessoa respondeu (ou atualizou a resposta).
    responded_at = Column(DateTime, nullable=False, server_default=func.now())

    # Campo livre de recado.
    note = Column(Text, nullable=True)

    companions = relationship(
        "Companion",
        back_populates="guest",
        cascade="all, delete-orphan",
    )


class Companion(Base):
    __tablename__ = "companions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="CASCADE"))
    guest = relationship("Guest", back_populates="companions")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    
    sender_name = Column(String, nullable=True)
    
    photo_url = Column(String, nullable=False)
    
    cloudinary_public_id = Column(String, nullable=False)
    
    uploaded_at = Column(DateTime, nullable=False, server_default=func.now())


class TableArrangement(Base):
    __tablename__ = "table_arrangements"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(Integer, nullable=False)
    
    # Pode ser um guest_id ou companion_id
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="CASCADE"), nullable=True)
    companion_id = Column(Integer, ForeignKey("companions.id", ondelete="CASCADE"), nullable=True)
    
    # Relacionamentos
    guest = relationship("Guest")
    companion = relationship("Companion")
