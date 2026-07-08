from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Aluno
from app.schemas import AlunoCreate, AlunoOut, AlunoAdmin
import shutil, os, uuid

router = APIRouter(prefix="/alunos", tags=["Alunos"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=AlunoOut, status_code=201)
def cadastrar_aluno(
    matricula: str = Form(...),
    nome: str = Form(...),
    email: str = Form(...),
    cr: float = Form(...),
    comprovante: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Valida duplicata
    if db.query(Aluno).filter(Aluno.matricula == matricula).first():
        raise HTTPException(400, "Matrícula já cadastrada")
    if db.query(Aluno).filter(Aluno.email == email).first():
        raise HTTPException(400, "Email já cadastrado")
    if not (0.0 <= cr <= 10.0):
        raise HTTPException(422, "CR deve estar entre 0 e 10")

    # Salva arquivo
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
        comprovante_path=filepath,
    )
    db.add(aluno)
    db.commit()
    db.refresh(aluno)
    return aluno


@router.get("/{matricula}", response_model=AlunoOut)
def buscar_aluno(matricula: str, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.matricula == matricula).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    return aluno


# ── Admin ───────────────────────────────────────────────────────────────────

@router.get("/admin/pendentes", response_model=list[AlunoAdmin])
def listar_pendentes(db: Session = Depends(get_db)):
    return db.query(Aluno).filter(Aluno.validado == False).all()


@router.get("/admin/todos", response_model=list[AlunoAdmin])
def listar_todos(db: Session = Depends(get_db)):
    return db.query(Aluno).all()


@router.patch("/admin/{aluno_id}/validar", response_model=AlunoOut)
def validar_aluno(aluno_id: int, db: Session = Depends(get_db)):
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(404, "Aluno não encontrado")
    aluno.validado = True
    db.commit()
    db.refresh(aluno)
    return aluno
