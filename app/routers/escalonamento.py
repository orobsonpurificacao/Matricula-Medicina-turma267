from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.ranking import ordem_geral

router = APIRouter(prefix="/escalonamento", tags=["Escalonamento"])


class AlunoEscalonado(BaseModel):
    posicao: int
    cr: float
    matricula: str
    nome: str
    motivo_prioridade: Optional[str] = None


@router.get("/lista", response_model=List[AlunoEscalonado])
def listar_escalonamento(db: Session = Depends(get_db)):
    """
    Escalonamento: uma classificação geral de TODOS os alunos, na mesma
    ordem que a alocação de vagas usa de verdade (ver app/ranking.py) —
    não tem relação direta com disciplina, turma ou vaga, é só a posição.

    Quem tem prioridade (marcada pelo admin, ex: PCD) aparece mais acima
    mesmo com CR mais baixo, e o motivo fica visível aqui pra todo mundo —
    decisão explícita de transparência do processo, igual a listas de
    cota em concursos públicos, que ficam abertas pra fiscalização.
    """
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
