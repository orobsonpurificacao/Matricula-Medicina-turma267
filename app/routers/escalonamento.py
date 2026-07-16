from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List
from app.database import get_db
from app.models import Disciplina, Turma, Inscricao, StatusInscricao

router = APIRouter(prefix="/escalonamento", tags=["Escalonamento"])


class AlocacaoAluno(BaseModel):
    posicao: int
    matricula: str
    nome: str
    cr: float
    status: StatusInscricao


class TurmaEscalonamento(BaseModel):
    turma_id: int
    numero: str
    tipo: str
    horario: str
    professor: str
    vagas: int
    vagas_ocupadas: int
    alunos: List[AlocacaoAluno]


class DisciplinaEscalonamento(BaseModel):
    disciplina_id: int
    codigo: str
    nome: str
    semestre: int
    turmas: List[TurmaEscalonamento]


@router.get("/lista", response_model=List[DisciplinaEscalonamento])
def listar_escalonamento(db: Session = Depends(get_db)):
    """
    Lista pública (qualquer aluno logado pode ver) do resultado do
    escalonamento: disciplina -> turma -> alunos ordenados por CR desc,
    com a posição de cada um e o status atual (alocado/fila/pendente/etc).
    Só inclui turmas que já têm pelo menos uma inscrição.
    """
    disciplinas = (
        db.query(Disciplina)
        .options(joinedload(Disciplina.turmas))
        .order_by(Disciplina.semestre, Disciplina.nome)
        .all()
    )

    resultado = []
    for d in disciplinas:
        turmas_com_dados = []
        for t in sorted(d.turmas, key=lambda x: (x.tipo, x.numero)):
            inscricoes = (
                db.query(Inscricao)
                .options(joinedload(Inscricao.aluno))
                .filter(Inscricao.turma_id == t.id)
                .all()
            )
            if not inscricoes:
                continue

            ordenadas = sorted(inscricoes, key=lambda i: (-i.aluno.cr, i.criado_em))

            alunos = [
                AlocacaoAluno(
                    posicao=idx + 1,
                    matricula=i.aluno.matricula,
                    nome=i.aluno.nome,
                    cr=i.aluno.cr,
                    status=i.status,
                )
                for idx, i in enumerate(ordenadas)
            ]

            turmas_com_dados.append(TurmaEscalonamento(
                turma_id=t.id,
                numero=t.numero,
                tipo=t.tipo,
                horario=t.horario,
                professor=t.professor,
                vagas=t.vagas,
                vagas_ocupadas=t.vagas_ocupadas,
                alunos=alunos,
            ))

        if turmas_com_dados:
            resultado.append(DisciplinaEscalonamento(
                disciplina_id=d.id,
                codigo=d.codigo,
                nome=d.nome,
                semestre=d.semestre,
                turmas=turmas_com_dados,
            ))

    return resultado
