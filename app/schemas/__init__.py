from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models import StatusInscricao


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
    comprovante_path: Optional[str] = None


class TurmaOut(BaseModel):
    id: int
    numero: str
    tipo: str
    professor: str
    horario: str
    sala: Optional[str] = None
    vagas: int
    vagas_ocupadas: int
    model_config = {"from_attributes": True}


class DisciplinaOut(BaseModel):
    id: int
    codigo: str
    nome: str
    semestre: int
    creditos: int
    descricao: Optional[str] = None
    turmas: List[TurmaOut] = []
    model_config = {"from_attributes": True}


class DisciplinaCreate(BaseModel):
    codigo: str
    nome: str
    creditos: int
    descricao: Optional[str] = None


class TurmaCreate(BaseModel):
    disciplina_id: int
    professor: str
    horario: str
    sala: Optional[str] = None
    vagas: int


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
    inscricao_id: int
    nova_turma_id: int


class ResultadoEscalonamento(BaseModel):
    alocados: int
    em_fila: int
    detalhes: List[dict]
