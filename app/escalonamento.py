"""
Escalonamento por CR.

Algoritmo:
  Para cada turma, ordena as inscrições pendentes pelo CR do aluno (desc).
  Aloca até o limite de vagas. O restante vai para fila.
  Ao final, atualiza vagas_ocupadas em cada turma.

Pode ser rodado múltiplas vezes (ex: segunda rodada para alternativas).
"""

from sqlalchemy.orm import Session, joinedload
from app.models import Inscricao, Turma, Aluno, StatusInscricao
from app.schemas import ResultadoEscalonamento
from collections import defaultdict


def rodar_escalonamento(db: Session) -> ResultadoEscalonamento:
    # Busca inscrições pendentes ou alternativas pendentes
    inscricoes = (
        db.query(Inscricao)
        .options(joinedload(Inscricao.aluno), joinedload(Inscricao.turma))
        .filter(
            Inscricao.status.in_([
                StatusInscricao.pendente,
                StatusInscricao.alternativa_pendente,
            ])
        )
        .all()
    )

    # Agrupa por turma
    por_turma: dict[int, list[Inscricao]] = defaultdict(list)
    for insc in inscricoes:
        por_turma[insc.turma_id].append(insc)

    alocados = 0
    em_fila = 0
    detalhes = []

    for turma_id, lista in por_turma.items():
        turma = db.query(Turma).filter(Turma.id == turma_id).first()
        vagas_restantes = turma.vagas - turma.vagas_ocupadas

        # Ordena por CR decrescente; empate: quem se inscreveu primeiro
        lista_ordenada = sorted(
            lista,
            key=lambda i: (-i.aluno.cr, i.criado_em),
        )

        for insc in lista_ordenada:
            if vagas_restantes > 0:
                insc.status = StatusInscricao.alocado
                vagas_restantes -= 1
                alocados += 1
                detalhes.append({
                    "aluno": insc.aluno.nome,
                    "matricula": insc.aluno.matricula,
                    "cr": insc.aluno.cr,
                    "turma_id": turma_id,
                    "disciplina": turma.disciplina.nome if turma.disciplina else "",
                    "status": "alocado",
                })
            else:
                insc.status = StatusInscricao.fila
                em_fila += 1
                detalhes.append({
                    "aluno": insc.aluno.nome,
                    "matricula": insc.aluno.matricula,
                    "cr": insc.aluno.cr,
                    "turma_id": turma_id,
                    "disciplina": turma.disciplina.nome if turma.disciplina else "",
                    "status": "fila",
                })

        # Atualiza vagas ocupadas na turma
        turma.vagas_ocupadas = turma.vagas - vagas_restantes

    db.commit()

    return ResultadoEscalonamento(
        alocados=alocados,
        em_fila=em_fila,
        detalhes=detalhes,
    )
