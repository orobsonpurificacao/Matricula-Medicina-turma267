"""
Alocação de vagas — SEMPRE na mesma ordem que a lista de escalonamento.

A LISTA de escalonamento (quem está em que posição, com prioridade e CR já
calculados) fica em app/ranking.py — essa é a fonte única da ordem.

Este arquivo é quem de fato EXECUTA a alocação: turma por turma, segue
exatamente essa mesma posição pra decidir quem ganha a vaga e quem vai pra
fila. É uma ação que muda o banco (grava status "alocado"/"fila" e
atualiza vagas_ocupadas) — só o admin roda isso, o aluno só consulta o
resultado depois.

Algoritmo:
  Para cada turma, ordena as inscrições pendentes pela posição do aluno
  na ordem geral de escalonamento (não pelo CR isolado da turma).
  Aloca até o limite de vagas. O restante vai para fila.
  Ao final, atualiza vagas_ocupadas em cada turma.

Pode ser rodado múltiplas vezes (ex: segunda rodada para alternativas).
"""

from sqlalchemy.orm import Session, joinedload
from app.models import Inscricao, Turma, Aluno, StatusInscricao
from app.schemas import ResultadoAlocacao
from app.ranking import mapa_posicoes
from collections import defaultdict


def rodar_alocacao(db: Session) -> ResultadoAlocacao:
    # Posição de cada aluno na ordem geral de escalonamento (prioridade + CR).
    # É essa mesma posição, e não o CR isolado, que decide a ordem dentro
    # de cada turma — assim a alocação nunca discorda do escalonamento.
    posicoes = mapa_posicoes(db)

    # Busca inscrições pendentes ou alternativas pendentes, só de alunos já
    # validados pelo administrador — quem ainda não validou fica em "pendente"
    # até ser validado e a alocação rodar de novo.
    inscricoes = (
        db.query(Inscricao)
        .options(joinedload(Inscricao.aluno), joinedload(Inscricao.turma))
        .join(Aluno)
        .filter(
            Inscricao.status.in_([
                StatusInscricao.pendente,
                StatusInscricao.alternativa_pendente,
            ]),
            Aluno.validado == True,
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

        # Ordena pela posição geral de escalonamento (prioridade + CR)
        lista_ordenada = sorted(
            lista,
            key=lambda i: posicoes.get(i.aluno_id, 10**9),
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

    return ResultadoAlocacao(
        alocados=alocados,
        em_fila=em_fila,
        detalhes=detalhes,
    )


def realocar_turma(db: Session, turma_id: int):
    """
    Reprocessa do ZERO só essa turma, toda vez que algo muda nela
    (inscrição nova, cancelamento, escolha de alternativa) — não só
    quem está "pendente" dessa vez, TODO MUNDO que já está ligado a
    essa turma entra na reavaliação.

    Por quê: se só olhasse "pendente", viraria quem chega primeiro leva
    (o já alocado nunca seria reconsiderado). Reprocessando sempre do
    zero, um aluno com posição melhor que se inscreve depois PODE
    desalocar quem já estava alocado — isso é intencional, é assim que
    o mérito por CR/prioridade fica sempre correto em tempo real, sem
    precisar esperar o admin apertar um botão.
    """
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        return

    posicoes = mapa_posicoes(db)

    inscricoes = (
        db.query(Inscricao)
        .join(Aluno)
        .filter(Inscricao.turma_id == turma_id, Aluno.validado == True)
        .all()
    )

    ordenadas = sorted(inscricoes, key=lambda i: posicoes.get(i.aluno_id, 10**9))

    for idx, insc in enumerate(ordenadas):
        insc.status = StatusInscricao.alocado if idx < turma.vagas else StatusInscricao.fila

    turma.vagas_ocupadas = min(len(ordenadas), turma.vagas)

    db.commit()
