from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List
from app.database import get_db
from app.models import Disciplina, Turma, Inscricao, PeriodoInscricao, StatusInscricao
from app.ranking import mapa_posicoes

router = APIRouter(prefix="/alocacao", tags=["Alocação"])


class AlunoAlocado(BaseModel):
    matricula: str
    nome: str
    posicao_escalonamento: int
    status: StatusInscricao


class TurmaAlocacao(BaseModel):
    turma_id: int
    numero: str
    tipo: str
    horario: str
    professor: str
    vagas: int
    vagas_ocupadas: int
    alunos: List[AlunoAlocado]


class DisciplinaAlocacao(BaseModel):
    disciplina_id: int
    codigo: str
    nome: str
    semestre: int
    turmas: List[TurmaAlocacao]


@router.get("/lista", response_model=List[DisciplinaAlocacao])
def listar_alocacao(db: Session = Depends(get_db)):
    """
    Mostra quem está alocado (ou em fila) em cada turma, agrupado por
    disciplina — diferente do escalonamento, que é uma lista geral sem
    relação com disciplina nenhuma. Só fica visível pros alunos depois
    que um admin libera explicitamente (ver /admin/alocacao/liberar).
    """
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    if not periodo or not periodo.alocacao_liberada:
        raise HTTPException(403, "Alocação em processamento. Aguarde liberação.")

    posicoes = mapa_posicoes(db)

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

            # Mesma ordem usada pra alocar de verdade (prioridade + CR),
            # não CR isolado — assim a tela bate com a decisão real.
            ordenadas = sorted(inscricoes, key=lambda i: posicoes.get(i.aluno_id, 10**9))

            alunos = [
                AlunoAlocado(
                    matricula=i.aluno.matricula,
                    nome=i.aluno.nome,
                    posicao_escalonamento=posicoes.get(i.aluno_id, 0),
                    status=i.status,
                )
                for i in ordenadas
            ]

            turmas_com_dados.append(TurmaAlocacao(
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
            resultado.append(DisciplinaAlocacao(
                disciplina_id=d.id,
                codigo=d.codigo,
                nome=d.nome,
                semestre=d.semestre,
                turmas=turmas_com_dados,
            ))

    return resultado
