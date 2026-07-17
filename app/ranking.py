"""
Uma única fonte de verdade pra ordem dos alunos.

Regra: quem tem prioridade (ex: PCD, marcado manualmente por um admin) vem
primeiro, ordenado por CR dentro desse grupo; depois todo mundo mais,
também por CR. Empate de CR: ordem alfabética pelo nome, só pra garantir
uma posição sempre igual e previsível.

Tanto a lista de escalonamento (app/routers/escalonamento.py, só mostra)
quanto a alocação de vagas (app/alocacao.py, decide de verdade quem fica
com a vaga) usam essa mesma função — a posição de alguém na lista é
exatamente a mesma posição usada pra alocar.
"""

from sqlalchemy.orm import Session
from app.models import Aluno


def ordem_geral(db: Session) -> list[Aluno]:
    return (
        db.query(Aluno)
        .order_by(Aluno.prioridade.desc(), Aluno.cr.desc(), Aluno.nome)
        .all()
    )


def mapa_posicoes(db: Session) -> dict[int, int]:
    """aluno_id -> posição (1-based) na ordem geral de escalonamento."""
    return {a.id: idx + 1 for idx, a in enumerate(ordem_geral(db))}
