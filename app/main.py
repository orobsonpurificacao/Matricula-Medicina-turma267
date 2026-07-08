from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import init_db
from app.routers import alunos, disciplinas, inscricoes, admin
import os

app = FastAPI(
    title="Sistema de Matrícula",
    description="Escalonamento de disciplinas por Coeficiente de Rendimento",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringir em produção
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alunos.router)
app.include_router(disciplinas.router)
app.include_router(inscricoes.router)
app.include_router(admin.router)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "docs": "/docs"}
