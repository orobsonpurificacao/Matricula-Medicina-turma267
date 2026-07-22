from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.alocacao import rodar_alocacao, realocar_turma
from app.models import Aluno, Inscricao, StatusInscricao, PeriodoInscricao
from app.schemas import ResultadoAlocacao, PeriodoOut, EstatisticasOut, AlunoOut, AlunoAdmin, PrioridadeUpdate, SenhaResetada
from passlib.context import CryptContext
import secrets
import string

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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


@router.post("/alocar", response_model=ResultadoAlocacao)
def alocar(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    """Roda a alocação de vagas com base no CR (ordem já vista na lista de escalonamento).
    Pode ser chamado múltiplas vezes — ex: uma rodada normal, depois outra pra
    processar quem escolheu alternativa."""
    return rodar_alocacao(db)


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


@router.post("/alocacao/liberar", response_model=PeriodoOut)
def liberar_alocacao(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    """Libera a tela de alocação pros alunos consultarem. Antes disso,
    a tela mostra só 'Alocação em processamento. Aguarde liberação.'"""
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    periodo.alocacao_liberada = True
    db.commit()
    db.refresh(periodo)
    return periodo


@router.post("/alocacao/bloquear", response_model=PeriodoOut)
def bloquear_alocacao(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    periodo.alocacao_liberada = False
    db.commit()
    db.refresh(periodo)
    return periodo


@router.post("/escalonamento/liberar", response_model=PeriodoOut)
def liberar_escalonamento(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    """Libera a tela de escalonamento pros alunos consultarem. Antes disso,
    a tela mostra só 'Escalonamento em processamento.'"""
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    periodo.escalonamento_liberado = True
    db.commit()
    db.refresh(periodo)
    return periodo


@router.post("/escalonamento/bloquear", response_model=PeriodoOut)
def bloquear_escalonamento(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    periodo = db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first()
    periodo.escalonamento_liberado = False
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
        alocacao_liberada=periodo.alocacao_liberada if periodo else False,
        escalonamento_liberado=periodo.escalonamento_liberado if periodo else False,
    )


@router.get("/administradores", response_model=list[AlunoOut])
def listar_administradores(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    return db.query(Aluno).filter(Aluno.is_admin == True).all()


@router.post("/promover/{aluno_id}", response_model=AlunoOut)
def promover_admin(
    aluno_id: int, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)
):
    """Concede is_admin a um aluno já cadastrado. Precisa já ser admin pra usar isso —
    o primeiro admin do sistema ainda precisa ser marcado direto no banco (via SSH)."""
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    aluno.is_admin = True
    db.commit()
    db.refresh(aluno)
    return aluno


@router.post("/rebaixar/{aluno_id}", response_model=AlunoOut)
def rebaixar_admin(
    aluno_id: int, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)
):
    """Remove is_admin de um aluno. Bloqueado se for o último admin restante,
    pra ninguém ficar trancado fora do painel sem acesso SSH."""
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")

    total_admins = db.query(Aluno).filter(Aluno.is_admin == True).count()
    if aluno.is_admin and total_admins <= 1:
        raise HTTPException(
            400,
            "Não é possível remover o último administrador do sistema. "
            "Promova outro admin antes de rebaixar este.",
        )

    aluno.is_admin = False
    db.commit()
    db.refresh(aluno)
    return aluno


@router.get("/prioritarios", response_model=list[AlunoAdmin])
def listar_prioritarios(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    """Alunos marcados com prioridade (ex: PCD) — só o admin vê essa lista.
    Não fica visível publicamente na lista de escalonamento."""
    return db.query(Aluno).filter(Aluno.prioridade == True).all()


@router.post("/prioridade/{aluno_id}", response_model=AlunoAdmin)
def definir_prioridade(
    aluno_id: int,
    payload: PrioridadeUpdate,
    db: Session = Depends(get_db),
    admin: Aluno = Depends(get_admin_atual),
):
    """
    Marca ou desmarca prioridade pra um aluno (ex: PCD), com uma ORDEM
    explícita entre os prioritários (1º, 2º, 3º...) — não é CR quem decide
    a ordem entre eles, é o número que o admin define aqui. Quem tem
    prioridade sobe pro topo do escalonamento — e como a alocação de vagas
    segue exatamente essa mesma ordem, isso também fura fila de verdade
    na hora de decidir quem fica com a vaga.
    """
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")

    if payload.ativar:
        if payload.ordem is not None:
            ordem = payload.ordem
        else:
            # Sem número informado: joga pro final da fila de prioritários
            maior_ordem_atual = (
                db.query(Aluno.ordem_prioridade)
                .filter(Aluno.prioridade == True)
                .order_by(Aluno.ordem_prioridade.desc())
                .first()
            )
            ordem = (maior_ordem_atual[0] + 1) if maior_ordem_atual and maior_ordem_atual[0] else 1

        aluno.prioridade = True
        aluno.ordem_prioridade = ordem
        aluno.motivo_prioridade = payload.motivo
    else:
        aluno.prioridade = False
        aluno.ordem_prioridade = None
        aluno.motivo_prioridade = None

    db.commit()

    # Reprocessa na hora as turmas em que esse aluno já está inscrito —
    # senão a prioridade só valeria a partir da próxima inscrição de
    # QUALQUER pessoa naquela turma, e não imediatamente.
    turmas_do_aluno = (
        db.query(Inscricao.turma_id)
        .filter(Inscricao.aluno_id == aluno_id)
        .distinct()
        .all()
    )
    for (turma_id,) in turmas_do_aluno:
        realocar_turma(db, turma_id)

    db.refresh(aluno)
    return aluno


@router.post("/resetar-senha/{aluno_id}", response_model=SenhaResetada)
def resetar_senha(
    aluno_id: int, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)
):
    """
    Gera uma senha temporária aleatória pro aluno e já salva o hash dela
    no banco. A senha em texto puro só existe nesse momento, na resposta —
    não fica guardada em lugar nenhum depois disso. O admin precisa
    repassar pro aluno por fora (WhatsApp, etc.) e orientar a trocar
    depois, se um dia existir tela de troca de senha pelo próprio aluno.
    """
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")

    alfabeto = string.ascii_uppercase + string.ascii_lowercase + string.digits
    senha_temporaria = "".join(secrets.choice(alfabeto) for _ in range(8))

    aluno.senha_hash = pwd_context.hash(senha_temporaria)
    db.commit()

    return SenhaResetada(
        matricula=aluno.matricula,
        nome=aluno.nome,
        senha_temporaria=senha_temporaria,
    )
