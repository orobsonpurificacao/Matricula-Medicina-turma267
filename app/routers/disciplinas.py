from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Disciplina, Turma, Inscricao, Aluno
from app.schemas import (
    DisciplinaCreate, DisciplinaOut, DisciplinaUpdate,
    TurmaCreate, TurmaOut, TurmaUpdate,
)
from app.routers.admin import get_admin_atual
from app.alocacao import realocar_turma

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
def criar_disciplina(
    data: DisciplinaCreate, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)
):
    if db.query(Disciplina).filter(Disciplina.codigo == data.codigo).first():
        raise HTTPException(400, "Código já existe")
    d = Disciplina(**data.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.patch("/admin/{disciplina_id}", response_model=DisciplinaOut)
def editar_disciplina(
    disciplina_id: int,
    data: DisciplinaUpdate,
    db: Session = Depends(get_db),
    admin: Aluno = Depends(get_admin_atual),
):
    d = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()
    if not d:
        raise HTTPException(404, "Disciplina não encontrada")

    dados = data.model_dump(exclude_unset=True)
    if "codigo" in dados and dados["codigo"] != d.codigo:
        if db.query(Disciplina).filter(Disciplina.codigo == dados["codigo"]).first():
            raise HTTPException(400, "Código já existe")

    for campo, valor in dados.items():
        setattr(d, campo, valor)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/admin/{disciplina_id}", status_code=204)
def excluir_disciplina(
    disciplina_id: int, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)
):
    d = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()
    if not d:
        raise HTTPException(404, "Disciplina não encontrada")

    qtd_turmas = db.query(Turma).filter(Turma.disciplina_id == disciplina_id).count()
    if qtd_turmas > 0:
        raise HTTPException(
            400,
            f"Disciplina tem {qtd_turmas} turma(s) vinculada(s). "
            f"Exclua as turmas primeiro.",
        )

    db.delete(d)
    db.commit()


@router.post("/admin/turmas", response_model=TurmaOut, status_code=201)
def criar_turma(
    data: TurmaCreate, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)
):
    if not db.query(Disciplina).filter(Disciplina.id == data.disciplina_id).first():
        raise HTTPException(404, "Disciplina não encontrada")
    t = Turma(**data.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.patch("/admin/turmas/{turma_id}", response_model=TurmaOut)
def editar_turma(
    turma_id: int,
    data: TurmaUpdate,
    db: Session = Depends(get_db),
    admin: Aluno = Depends(get_admin_atual),
):
    t = db.query(Turma).filter(Turma.id == turma_id).first()
    if not t:
        raise HTTPException(404, "Turma não encontrada")

    dados = data.model_dump(exclude_unset=True)

    vagas_nova = dados.get("vagas", t.vagas)
    reservadas_nova = dados.get("vagas_reservadas", t.vagas_reservadas)

    if reservadas_nova > vagas_nova:
        raise HTTPException(
            400,
            f"Não é possível reservar {reservadas_nova} vaga(s) numa turma "
            f"que só tem {vagas_nova} no total.",
        )

    vagas_disputa_nova = vagas_nova - reservadas_nova
    if vagas_disputa_nova < t.vagas_ocupadas:
        raise HTTPException(
            400,
            f"Não é possível deixar só {vagas_disputa_nova} vaga(s) pra disputa: "
            f"já existem {t.vagas_ocupadas} aluno(s) alocado(s) nesta turma.",
        )

    for campo, valor in dados.items():
        setattr(t, campo, valor)
    db.commit()

    # Vagas mudaram (total ou reservadas) — reprocessa quem está
    # concorrendo nessa turma com a capacidade nova.
    if "vagas" in dados or "vagas_reservadas" in dados:
        realocar_turma(db, turma_id)

    db.refresh(t)
    return t


@router.delete("/admin/turmas/{turma_id}", status_code=204)
def excluir_turma(
    turma_id: int, db: Session = Depends(get_db), admin: Aluno = Depends(get_admin_atual)
):
    t = db.query(Turma).filter(Turma.id == turma_id).first()
    if not t:
        raise HTTPException(404, "Turma não encontrada")

    qtd_inscricoes = db.query(Inscricao).filter(Inscricao.turma_id == turma_id).count()
    if qtd_inscricoes > 0:
        raise HTTPException(
            400,
            f"Turma tem {qtd_inscricoes} inscrição(ões) vinculada(s). "
            f"Não é possível excluir — remova as inscrições primeiro ou "
            f"desative a turma manualmente.",
        )

    db.delete(t)
    db.commit()
