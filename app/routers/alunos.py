from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Aluno, Inscricao
from app.schemas import AlunoOut, AlunoAdmin, RejeitarComprovante, TrocarSenhaInput, AlunoAdminUpdate
from app.routers.admin import get_admin_atual
from app.alocacao import realocar_turma
from passlib.context import CryptContext
import shutil, os, uuid

router = APIRouter(prefix="/alunos", tags=["Alunos"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/", response_model=AlunoOut, status_code=201)
def cadastrar_aluno(
    matricula: str = Form(...),
    nome: str = Form(...),
    email: str = Form(...),
    cr: float = Form(...),
    senha: str = Form(...),
    comprovante: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if db.query(Aluno).filter(Aluno.matricula == matricula).first():
        raise HTTPException(400, "Matricula ja cadastrada")
    if db.query(Aluno).filter(Aluno.email == email).first():
        raise HTTPException(400, "Email ja cadastrado")
    if not (0.0 <= cr <= 10.0):
        raise HTTPException(422, "CR deve estar entre 0 e 10")
    if len(senha) < 8:
        raise HTTPException(422, "Senha deve ter no minimo 8 caracteres")
    ext = os.path.splitext(comprovante.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(comprovante.file, f)
    aluno = Aluno(
        matricula=matricula.strip(),
        nome=nome.strip(),
        email=email.strip(),
        cr=cr,
        senha_hash=pwd_context.hash(senha),
        comprovante_path=filepath,
    )
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return aluno

@router.post("/login", response_model=AlunoOut)
def login(
    matricula: str = Form(...),
    senha: str = Form(...),
    db: Session = Depends(get_db),
):
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Matricula nao encontrada")
    if not pwd_context.verify(senha, aluno.senha_hash):
        raise HTTPException(401, "Senha incorreta")
    return aluno

@router.get("/{matricula}", response_model=AlunoOut)
def buscar_aluno(matricula: str, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Aluno nao encontrado")
    return aluno

@router.get("/admin/pendentes", response_model=list[AlunoAdmin])
def listar_pendentes(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    return db.query(Aluno).filter(Aluno.validado == False, Aluno.recusado == False).all()

@router.get("/admin/todos", response_model=list[AlunoAdmin])
def listar_todos(db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    return db.query(Aluno).all()

@router.patch("/admin/{aluno_id}/validar", response_model=AlunoOut)
def validar_aluno(aluno_id: int, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno nao encontrado")

    # LGPD: depois de validado, o histórico não precisa mais existir no
    # servidor — apaga o arquivo de verdade, não só o registro no banco.
    if aluno.comprovante_path and os.path.exists(aluno.comprovante_path):
        os.remove(aluno.comprovante_path)

    aluno.validado = True
    aluno.recusado = False
    aluno.motivo_recusa = None
    aluno.comprovante_path = None
    db.commit()

    # Reprocessa na hora as turmas em que esse aluno já está inscrito —
    # antes de validar, ele nunca competia (só quem tem validado=True
    # entra na disputa). Sem isso, a inscrição dele ficava "pendente"
    # pra sempre até outra pessoa mexer naquela turma.
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

@router.patch("/admin/{aluno_id}/rejeitar", response_model=AlunoOut)
def rejeitar_aluno(
    aluno_id: int,
    payload: RejeitarComprovante,
    db: Session = Depends(get_db),
    admin: Aluno = Depends(get_admin_atual),
):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno nao encontrado")
    aluno.validado = False
    aluno.recusado = True
    aluno.motivo_recusa = payload.motivo
    db.commit()

    # Se esse aluno já estava alocado em alguma turma (validado antes,
    # rejeitado agora por algum motivo), reprocessa pra liberar a vaga —
    # sem validado=True ele não pode mais ocupar vaga nenhuma.
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


@router.post("/{matricula}/trocar-senha")
def trocar_senha(matricula: str, payload: TrocarSenhaInput, db: Session = Depends(get_db)):
    """
    O próprio aluno troca a senha, sem precisar de admin — mas precisa
    saber a senha ATUAL pra provar que é ele mesmo (não tem sessão/token
    nesse sistema, então é essa a verificação de identidade possível).
    Serve tanto pra trocar a senha temporária que um admin gerou quanto
    pra trocar a senha normal por vontade própria.
    """
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")

    if not pwd_context.verify(payload.senha_atual, aluno.senha_hash):
        raise HTTPException(401, "Senha atual incorreta")

    if len(payload.senha_nova) < 8:
        raise HTTPException(400, "A nova senha precisa ter pelo menos 8 caracteres")

    aluno.senha_hash = pwd_context.hash(payload.senha_nova)
    db.commit()
    return {"status": "ok"}


@router.patch("/admin/{aluno_id}", response_model=AlunoAdmin)
def editar_aluno(
    aluno_id: int,
    payload: AlunoAdminUpdate,
    db: Session = Depends(get_db),
    admin: Aluno = Depends(get_admin_atual),
):
    """
    Admin corrige dado que o aluno preencheu errado (ex: CR digitado
    diferente do que está no histórico) sem precisar rejeitar o cadastro
    inteiro e obrigar a pessoa a se cadastrar de novo.
    """
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno nao encontrado")

    dados = payload.model_dump(exclude_unset=True)

    if "cr" in dados and dados["cr"] is not None:
        if not (0.0 <= dados["cr"] <= 10.0):
            raise HTTPException(422, "CR deve estar entre 0 e 10")

    if "email" in dados and dados["email"] is not None:
        email_em_uso = (
            db.query(Aluno)
            .filter(Aluno.email == dados["email"], Aluno.id != aluno_id)
            .first()
        )
        if email_em_uso:
            raise HTTPException(400, "Email já está em uso por outro aluno")

    if "matricula" in dados and dados["matricula"] is not None:
        matricula_em_uso = (
            db.query(Aluno)
            .filter(Aluno.matricula == dados["matricula"], Aluno.id != aluno_id)
            .first()
        )
        if matricula_em_uso:
            raise HTTPException(400, "Matrícula já está em uso por outro aluno")

    for campo, valor in dados.items():
        if valor is not None:
            setattr(aluno, campo, valor)

    db.commit()
    db.refresh(aluno)
    return aluno


@router.post("/{matricula}/reenviar-comprovante", response_model=AlunoOut)
def reenviar_comprovante(
    matricula: str,
    comprovante: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Aluno que teve o comprovante/histórico rejeitado manda um novo, sem
    precisar recriar a conta. Volta pro estado 'pendente' de novo, pra
    um admin validar (ou rejeitar de novo, se ainda estiver errado).
    """
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Aluno nao encontrado")
    if not aluno.recusado:
        raise HTTPException(400, "Esse aluno não está com o comprovante rejeitado")

    ext = os.path.splitext(comprovante.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(comprovante.file, f)

    aluno.comprovante_path = filepath
    aluno.recusado = False
    aluno.motivo_recusa = None
    aluno.validado = False
    db.commit()
    db.refresh(aluno)
    return aluno
