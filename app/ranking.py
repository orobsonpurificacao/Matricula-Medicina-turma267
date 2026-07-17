"""
Uma única fonte de verdade pra ordem dos alunos.

Regra: quem tem prioridade (ex: PCD, marcado manualmente por um admin) vem
primeiro — e entre os prioritários, a ordem é a que o admin definiu na mão
(ordem_prioridade: 1º, 2º, 3º...), não o CR. Só depois de esgotar quem tem
prioridade é que o resto entra, ordenado por CR.

Tanto a lista de escalonamento (app/routers/escalonamento.py, só mostra)
quanto a alocação de vagas (app/alocacao.py, decide de verdade quem fica
com a vaga) usam essa mesma função — a posição de alguém na lista é
exatamente a mesma posição usada pra alocar.
"""

from sqlalchemy.orm import Session
from app.models import Aluno


def ordem_geral(db: Session) -> list[Aluno]:
    alunos = db.query(Aluno).all()

    def chave(a: Aluno):
        if a.ordem_prioridade is not None:
            # Bucket 0: prioritários, na ordem manual que o admin definiu.
            # Empate na mesma ordem manual (não deveria acontecer, mas se
            # acontecer): desempata por CR, só pra ter um resultado estável.
            return (0, a.ordem_prioridade, -a.cr, a.nome)
        # Bucket 1: todo mundo mais, por CR desc.
        return (1, 0, -a.cr, a.nome)

    return sorted(alunos, key=chave)


def mapa_posicoes(db: Session) -> dict[int, int]:
    """aluno_id -> posição (1-based) na ordem geral de escalonamento."""
    return {a.id: idx + 1 for idx, a in enumerate(ordem_geral(db))}
