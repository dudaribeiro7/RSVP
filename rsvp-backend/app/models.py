# app/models.py
from __future__ import annotations

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    confirmed = Column(Boolean, default=False)

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
