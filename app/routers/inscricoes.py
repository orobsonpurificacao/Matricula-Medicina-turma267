from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Aluno, Turma, Inscricao, StatusInscricao, PeriodoInscricao
from app.schemas import InscricaoCreate, InscricaoOut, InscricaoAlternativaCreate

router = APIRouter(prefix="/inscricoes", tags=["Inscrições"])


def _get_aluno_validado(matricula: str, db: Session) -> Aluno:
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    if not aluno.validado:
        raise HTTPException(403, "Comprovante ainda não validado pelo administrador")
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
    aluno = _get_aluno_validado(matricula, db)
    _checar_periodo_aberto(db)

    criadas = []
    for item in inscricoes:
        turma = db.query(Turma).filter(Turma.id == item.turma_id).first()
        if not turma:
            raise HTTPException(404, f"Turma {item.turma_id} não encontrada")

        # Evita duplicata na mesma disciplina
        ja_inscrito = (
            db.query(Inscricao)
            .join(Turma)
            .filter(
                Inscricao.aluno_id == aluno.id,
                Turma.disciplina_id == turma.disciplina_id,
                Inscricao.status != StatusInscricao.fila,
            )
            .first()
        )
        if ja_inscrito:
            raise HTTPException(
                400,
                f"Já existe inscrição para a disciplina da turma {item.turma_id}",
            )

        inscricao = Inscricao(
            aluno_id=aluno.id,
            turma_id=item.turma_id,
            prioridade=item.prioridade,
            status=StatusInscricao.pendente,
        )
        db.add(inscricao)
        criadas.append(inscricao)

    db.commit()
    for i in criadas:
        db.refresh(i)
    return criadas


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
    db.refresh(inscricao)
    return inscricao
