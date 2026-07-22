from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models import Aluno, PeriodoInscricao
from app.ranking import ordem_geral

router = APIRouter(prefix="/escalonamento", tags=["Escalonamento"])


class AlunoEscalonado(BaseModel):
    posicao: int
    cr: float
    matricula: str
    nome: str
    motivo_prioridade: Optional[str] = None


@router.get("/lista", response_model=List[AlunoEscalonado])
def listar_escalonamento(
    db: Session = Depends(get_db),
    x_aluno_matricula: Optional[str] = Header(None, alias="X-Aluno-Matricula"),
):
    """
    Escalonamento: uma classificação geral de TODOS os alunos, na mesma
    ordem que a alocação de vagas usa de verdade (ver app/ranking.py) —
    não tem relação direta com disciplina, turma ou vaga, é só a posição.

    Só fica visível pros alunos depois que um admin libera (ver
    /admin/escalonamento/liberar) — admin sempre vê, mesmo sem liberar,
    pra poder conferir antes de abrir pra todo mundo.

    Quem tem prioridade (marcada pelo admin, ex: PCD) aparece mais acima
    mesmo com CR mais baixo, e o motivo fica visível aqui pra todo mundo —
    decisão explícita de transparência do processo, igual a listas de
    cota em concursos públicos, que ficam abertas pra fiscalização.
    """
    aluno_atual = None
    if x_aluno_matricula:
        aluno_atual = db.query(Aluno).filter(Aluno.matricula == x_aluno_matricula).first()

    if not aluno_atual or not aluno_atual.is_admin:
        periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
        if not periodo or not periodo.escalonamento_liberado:
            raise HTTPException(403, "Escalonamento em processamento.")

    alunos = ordem_geral(db)

    return [
        AlunoEscalonado(
            posicao=idx + 1,
            cr=a.cr,
            matricula=a.matricula,
            nome=a.nome,
            motivo_prioridade=a.motivo_prioridade if a.prioridade else None,
        )
        for idx, a in enumerate(alunos)
    ]
