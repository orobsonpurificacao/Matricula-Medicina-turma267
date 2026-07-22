from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Aluno, Turma, Inscricao, StatusInscricao, PeriodoInscricao
from app.schemas import InscricaoCreate, InscricaoOut, InscricaoAlternativaCreate
from app.alocacao import realocar_turma

router = APIRouter(prefix="/inscricoes", tags=["Inscrições"])


def _get_aluno(matricula: str, db: Session) -> Aluno:
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    return aluno


def _checar_periodo_aberto(db: Session):
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    if not periodo or not periodo.aberto:
        raise HTTPException(400, "Período de inscrição está fechado")


@router.post("/{matricula}", response_model=list[InscricaoOut], status_code=201)
def inscrever(
    matricula: str,
    inscricoes: list[InscricaoCreate],
    db: Session = Depends(get_db),
):
    """
    Upsert de inscrições: um aluno pode ter no máximo 1 inscrição de tipo
    prática e 1 de tipo teórica por disciplina (as duas juntas, quando a
    disciplina tiver os dois tipos). Reenviar uma escolha diferente pra
    uma disciplina já inscrita SUBSTITUI a anterior — inclusive se ela já
    estava "alocado" — desde que o período de inscrição ainda esteja
    aberto (é essa checagem que impede edição depois que o período fecha).

    A alocação de vaga acontece automaticamente aqui, na hora — não
    precisa de admin apertar botão. Isso significa que quem já estava
    "alocado" numa turma pode voltar pra "fila" se alguém com posição
    melhor se inscrever depois (é assim que o mérito fica sempre certo).
    """
    aluno = _get_aluno(matricula, db)
    _checar_periodo_aberto(db)

    resultado = []
    turmas_afetadas = set()
    for item in inscricoes:
        turma = db.query(Turma).filter(Turma.id == item.turma_id).first()
        if not turma:
            raise HTTPException(404, f"Turma {item.turma_id} não encontrada")

        existente = (
            db.query(Inscricao)
            .join(Turma)
            .filter(
                Inscricao.aluno_id == aluno.id,
                Turma.disciplina_id == turma.disciplina_id,
                Turma.tipo == turma.tipo,
                Inscricao.status != StatusInscricao.fila,
            )
            .first()
        )

        if existente and existente.turma_id == item.turma_id:
            # Já inscrito exatamente nessa turma — não faz nada, evita duplicar.
            resultado.append(existente)
            continue

        if existente:
            # Troca de turma: a realocação automática (chamada logo abaixo)
            # já vai recalcular vagas_ocupadas das duas turmas do zero —
            # não precisa mais decrementar na mão aqui.
            turmas_afetadas.add(existente.turma_id)

            existente.turma_id = item.turma_id
            existente.prioridade = item.prioridade
            existente.status = StatusInscricao.pendente
            existente.criado_em = datetime.utcnow()
            resultado.append(existente)
        else:
            nova = Inscricao(
                aluno_id=aluno.id,
                turma_id=item.turma_id,
                prioridade=item.prioridade,
                status=StatusInscricao.pendente,
            )
            db.add(nova)
            resultado.append(nova)

        turmas_afetadas.add(item.turma_id)

    db.commit()

    # Realocação automática: reprocessa cada turma afetada, na hora,
    # com base na posição de escalonamento de todo mundo inscrito nela.
    for turma_id in turmas_afetadas:
        realocar_turma(db, turma_id)

    for i in resultado:
        db.refresh(i)
    return resultado


@router.delete("/{matricula}/{inscricao_id}", status_code=204)
def cancelar_inscricao(
    matricula: str,
    inscricao_id: int,
    db: Session = Depends(get_db),
):
    """
    Cancela de verdade uma inscrição — usado quando o aluno desmarca uma
    disciplina que já tinha escolhido antes. Sem isso, desmarcar na tela
    não tinha efeito nenhum no banco (a inscrição antiga ficava lá pra
    sempre). Só funciona com o período de inscrição aberto, mesma regra
    de qualquer outra edição.
    """
    aluno = _get_aluno(matricula, db)
    _checar_periodo_aberto(db)

    inscricao = (
        db.query(Inscricao)
        .filter(Inscricao.id == inscricao_id, Inscricao.aluno_id == aluno.id)
        .first()
    )
    if not inscricao:
        raise HTTPException(404, "Inscrição não encontrada")

    turma_id = inscricao.turma_id
    db.delete(inscricao)
    db.commit()

    # Reprocessa a turma sem essa inscrição — se alguém tava em fila
    # esperando essa vaga, já sobe pra alocado automaticamente aqui.
    realocar_turma(db, turma_id)


@router.get("/{matricula}", response_model=list[InscricaoOut])
def minhas_inscricoes(matricula: str, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    return (
        db.query(Inscricao)
        .options(joinedload(Inscricao.turma))
        .filter(Inscricao.aluno_id == aluno.id)
        .all()
    )


@router.post("/alternativa/escolher", response_model=InscricaoOut)
def escolher_alternativa(
    data: InscricaoAlternativaCreate,
    db: Session = Depends(get_db),
):
    inscricao = db.query(Inscricao).filter(Inscricao.id == data.inscricao_id).first()
    if not inscricao:
        raise HTTPException(404, "Inscrição não encontrada")
    if inscricao.status != StatusInscricao.fila:
        raise HTTPException(400, "Apenas inscrições em fila podem escolher alternativa")

    nova_turma = db.query(Turma).filter(Turma.id == data.nova_turma_id).first()
    if not nova_turma:
        raise HTTPException(404, "Turma alternativa não encontrada")

    inscricao.turma_id = data.nova_turma_id
    inscricao.prioridade = 2
    inscricao.status = StatusInscricao.alternativa_pendente
    db.commit()

    realocar_turma(db, data.nova_turma_id)

    db.refresh(inscricao)
    return inscricao
