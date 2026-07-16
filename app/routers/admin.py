from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.escalonamento import rodar_escalonamento
from app.models import Aluno, Inscricao, StatusInscricao, PeriodoInscricao
from app.schemas import ResultadoEscalonamento, PeriodoOut, EstatisticasOut

router = APIRouter(prefix="/admin", tags=["Admin"])


def get_admin_atual(
    x_aluno_matricula: str = Header(..., alias="X-Aluno-Matricula"),
    db: Session = Depends(get_db),
) -> Aluno:
    """
    Sem JWT no projeto: o frontend reenvia a matrícula do aluno logado
    em todo request admin, e aqui checamos is_admin contra o banco.
    """
    aluno = db.query(Aluno).filter(Aluno.matricula == x_aluno_matricula).first()
    if not aluno:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Matrícula não reconhecida")
    if not aluno.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso restrito ao administrador")
    return aluno


@router.post("/escalonar", response_model=ResultadoEscalonamento)
def escalonar(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    """Roda o escalonamento por CR. Pode ser chamado múltiplas vezes."""
    return rodar_escalonamento(db)


@router.get("/periodo", response_model=PeriodoOut)
def get_periodo(db: Session = Depends(get_db)):
    """Público (sem proteção) — o frontend do aluno usa isso pra saber
    se o período de inscrição está aberto."""
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    if not periodo:
        raise HTTPException(500, "Período de inscrição não inicializado")
    return periodo


@router.post("/periodo/abrir", response_model=PeriodoOut)
def abrir_periodo(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    periodo.aberto = True
    db.commit()
    db.refresh(periodo)
    return periodo


@router.post("/periodo/fechar", response_model=PeriodoOut)
def fechar_periodo(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    periodo.aberto = False
    db.commit()
    db.refresh(periodo)
    return periodo


@router.get("/estatisticas", response_model=EstatisticasOut)
def get_estatisticas(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    return EstatisticasOut(
        total_alunos=db.query(Aluno).count(),
        comprovantes_pendentes=db.query(Aluno).filter(
            Aluno.validado == False, Aluno.recusado == False
        ).count(),
        comprovantes_validados=db.query(Aluno).filter(Aluno.validado == True).count(),
        comprovantes_recusados=db.query(Aluno).filter(Aluno.recusado == True).count(),
        inscricoes_alocadas=db.query(Inscricao).filter(
            Inscricao.status == StatusInscricao.alocado
        ).count(),
        inscricoes_em_fila=db.query(Inscricao).filter(
            Inscricao.status == StatusInscricao.fila
        ).count(),
        inscricoes_alternativa_pendente=db.query(Inscricao).filter(
            Inscricao.status == StatusInscricao.alternativa_pendente
        ).count(),
        periodo_aberto=periodo.aberto if periodo else False,
    )
