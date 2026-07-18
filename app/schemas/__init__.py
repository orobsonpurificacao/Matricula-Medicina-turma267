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
    recusado: bool
    motivo_recusa: Optional[str] = None
    is_admin: bool
    criado_em: datetime
    model_config = {"from_attributes": True}


class AlunoAdminUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    cr: Optional[float] = None


class AlunoAdmin(AlunoOut):
    comprovante_path: Optional[str] = None
    motivo_recusa: Optional[str] = None
    prioridade: bool = False
    ordem_prioridade: Optional[int] = None
    motivo_prioridade: Optional[str] = None


class PrioridadeUpdate(BaseModel):
    ativar: bool
    ordem: Optional[int] = None
    motivo: Optional[str] = None


class SenhaResetada(BaseModel):
    matricula: str
    nome: str
    senha_temporaria: str


class TrocarSenhaInput(BaseModel):
    senha_atual: str
    senha_nova: str


class RejeitarComprovante(BaseModel):
    motivo: Optional[str] = None


class PeriodoOut(BaseModel):
    aberto: bool
    alocacao_liberada: bool
    model_config = {"from_attributes": True}


class EstatisticasOut(BaseModel):
    total_alunos: int
    comprovantes_pendentes: int
    comprovantes_validados: int
    comprovantes_recusados: int
    inscricoes_alocadas: int
    inscricoes_em_fila: int
    inscricoes_alternativa_pendente: int
    periodo_aberto: bool
    alocacao_liberada: bool


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
    semestre: int
    creditos: int
    descricao: Optional[str] = None


class TurmaCreate(BaseModel):
    disciplina_id: int
    numero: str = "01"
    tipo: str = "T"
    professor: str
    horario: str
    sala: Optional[str] = None
    vagas: int


class TurmaUpdate(BaseModel):
    numero: Optional[str] = None
    tipo: Optional[str] = None
    professor: Optional[str] = None
    horario: Optional[str] = None
    sala: Optional[str] = None
    vagas: Optional[int] = None


class DisciplinaUpdate(BaseModel):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    semestre: Optional[int] = None
    creditos: Optional[int] = None
    descricao: Optional[str] = None


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


class ResultadoAlocacao(BaseModel):
    alocados: int
    em_fila: int
    detalhes: List[dict]
