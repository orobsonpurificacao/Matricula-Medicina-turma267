from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Disciplina, Turma
from app.schemas import DisciplinaCreate, DisciplinaOut, TurmaCreate, TurmaOut

router = APIRouter(prefix="/disciplinas", tags=["Disciplinas"])


@router.get("/", response_model=list[DisciplinaOut])
def listar_disciplinas(db: Session = Depends(get_db)):
    return (
        db.query(Disciplina)
        .options(joinedload(Disciplina.turmas))
        .all()
    )


@router.get("/{disciplina_id}", response_model=DisciplinaOut)
def buscar_disciplina(disciplina_id: int, db: Session = Depends(get_db)):
    d = (
        db.query(Disciplina)
        .options(joinedload(Disciplina.turmas))
        .filter(Disciplina.id == disciplina_id)
        .first()
    )
    if not d:
        raise HTTPException(404, "Disciplina não encontrada")
    return d


# ── Admin ────────────────────────────────────────────────────────────────────

@router.post("/admin/", response_model=DisciplinaOut, status_code=201)
def criar_disciplina(data: DisciplinaCreate, db: Session = Depends(get_db)):
    if db.query(Disciplina).filter(Disciplina.codigo == data.codigo).first():
        raise HTTPException(400, "Código já existe")
    d = Disciplina(**data.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.post("/admin/turmas", response_model=TurmaOut, status_code=201)
def criar_turma(data: TurmaCreate, db: Session = Depends(get_db)):
    if not db.query(Disciplina).filter(Disciplina.id == data.disciplina_id).first():
        raise HTTPException(404, "Disciplina não encontrada")
    t = Turma(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t
