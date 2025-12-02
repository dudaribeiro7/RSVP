# app/main.py
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import guests
from app.routers import companions

# Cria as tabelas no banco (para dev; em prod você pode usar migrações)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Formatura RSVP API",
    version="1.0.0",
)

# CORS liberado (depois podemos restringir para o domínio do seu site)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "API de RSVP funcionando."}


app.include_router(guests.router)
app.include_router(companions.router)
