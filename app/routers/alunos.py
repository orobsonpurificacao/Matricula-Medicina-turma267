from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Aluno
from app.schemas import AlunoOut, AlunoAdmin, RejeitarComprovante, TrocarSenhaInput
from app.routers.admin import get_admin_atual
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
    aluno.validado = True
    aluno.recusado = False
    aluno.motivo_recusa = None
    db.commit()
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
