from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models import StatusInscricao


# ── Aluno ──────────────────────────────────────────────
class AlunoCreate(BaseModel):
    matricula: str
    nome: str
    email: str
    cr: float

    @field_validator("cr")
    @classmethod
    def cr_valido(cls, v):
        if not (0.0 <= v <= 10.0):
            raise ValueError("CR deve estar entre 0 e 10")
        return v

    @field_validator("matricula")
    @classmethod
    def matricula_nao_vazia(cls, v):
        if not v.strip():
            raise ValueError("Matrícula não pode ser vazia")
        return v.strip()


class AlunoOut(BaseModel):
    id: int
    matricula: str
    nome: str
    email: str
    cr: float
    validado: bool
    criado_em: datetime

    model_config = {"from_attributes": True}


class AlunoAdmin(AlunoOut):
    comprovante_path: Optional[str]


# ── Disciplina ─────────────────────────────────────────
class DisciplinaCreate(BaseModel):
    codigo: str
    nome: str
    creditos: int
    descricao: Optional[str] = None


class TurmaOut(BaseModel):
    id: int
    professor: str
    horario: str
    sala: Optional[str]
    vagas: int
    vagas_ocupadas: int

    model_config = {"from_attributes": True}


class DisciplinaOut(BaseModel):
    id: int
    codigo: str
    nome: str
    creditos: int
    descricao: Optional[str]
    turmas: List[TurmaOut] = []

    model_config = {"from_attributes": True}


# ── Turma ──────────────────────────────────────────────
class TurmaCreate(BaseModel):
    disciplina_id: int
    professor: str
    horario: str
    sala: Optional[str] = None
    vagas: int


# ── Inscrição ──────────────────────────────────────────
class InscricaoCreate(BaseModel):
    turma_id: int
    prioridade: int = 1


class InscricaoOut(BaseModel):
    id: int
    turma_id: int
    prioridade: int
    status: StatusInscricao
    criado_em: datetime
    turma: TurmaOut

    model_config = {"from_attributes": True}


class InscricaoAlternativaCreate(BaseModel):
    inscricao_id: int   # inscrição que ficou em fila
    nova_turma_id: int  # turma alternativa escolhida


# ── Escalonamento ──────────────────────────────────────
class ResultadoEscalonamento(BaseModel):
    alocados: int
    em_fila: int
    detalhes: List[dict]
