# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.api.routes import auth

# Crear tablas en MySQL
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Central Esterilización Backend")

# Configurar CORS para permitir que tu Vercel (TypeScript) se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción cambiar a tu URL de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar las rutas
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])