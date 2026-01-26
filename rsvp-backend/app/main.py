import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import guests, companions, photos

# from app import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Formatura RSVP API", version="1.0.0")

origins = [
    o.strip()
    for o in os.getenv("FRONTEND_ORIGINS", "http://127.0.0.1:5500").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "API de RSVP funcionando."}

app.include_router(guests.router)
app.include_router(companions.router)
app.include_router(photos.router)