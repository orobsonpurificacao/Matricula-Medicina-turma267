from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Disciplina, Turma

DATABASE_URL = "sqlite:///./matricula.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    _seed_disciplinas()


def _seed_disciplinas():
    """Popula disciplinas e turmas de exemplo (medicina - 3º semestre UFBA)."""
    db = SessionLocal()
    try:
        if db.query(Disciplina).count() > 0:
            return  # já populado

        disciplinas = [
            {
                "codigo": "MED301",
                "nome": "Anatomia de Sistemas II",
                "creditos": 6,
                "descricao": "Sistemas cardiovascular, respiratório e nervoso",
                "turmas": [
                    {"professor": "Prof. Dr. Carlos Mendes", "horario": "Seg/Qua 08:00-10:00", "sala": "Anf. A1", "vagas": 30},
                    {"professor": "Prof. Dr. Carlos Mendes", "horario": "Ter/Qui 10:00-12:00", "sala": "Anf. A2", "vagas": 30},
                ],
            },
            {
                "codigo": "MED302",
                "nome": "Fisiologia Humana I",
                "creditos": 4,
                "descricao": "Fisiologia celular, muscular e cardiovascular",
                "turmas": [
                    {"professor": "Profa. Dra. Lúcia Ferreira", "horario": "Seg/Qua 10:00-12:00", "sala": "Lab. Fisio", "vagas": 25},
                    {"professor": "Profa. Dra. Lúcia Ferreira", "horario": "Ter/Qui 08:00-10:00", "sala": "Lab. Fisio", "vagas": 25},
                ],
            },
            {
                "codigo": "MED303",
                "nome": "Bioquímica Médica",
                "creditos": 4,
                "descricao": "Metabolismo, enzimologia e bioenergética",
                "turmas": [
                    {"professor": "Prof. Dr. André Lima", "horario": "Qua/Sex 08:00-10:00", "sala": "Anf. B3", "vagas": 40},
                ],
            },
            {
                "codigo": "MED304",
                "nome": "Histologia e Embriologia",
                "creditos": 4,
                "descricao": "Tecidos humanos e desenvolvimento embrionário",
                "turmas": [
                    {"professor": "Profa. Dra. Marina Santos", "horario": "Ter/Sex 14:00-16:00", "sala": "Lab. Histo", "vagas": 20},
                    {"professor": "Profa. Dra. Marina Santos", "horario": "Seg/Qui 14:00-16:00", "sala": "Lab. Histo", "vagas": 20},
                ],
            },
            {
                "codigo": "MED305",
                "nome": "Microbiologia e Imunologia",
                "creditos": 4,
                "descricao": "Bacteriologia, virologia e resposta imune",
                "turmas": [
                    {"professor": "Prof. Dr. Roberto Alves", "horario": "Qui/Sex 10:00-12:00", "sala": "Lab. Micro", "vagas": 25},
                ],
            },
            {
                "codigo": "MED306",
                "nome": "Saúde Coletiva I",
                "creditos": 2,
                "descricao": "Epidemiologia, SUS e determinantes sociais",
                "turmas": [
                    {"professor": "Profa. Dra. Juliana Costa", "horario": "Sex 08:00-10:00", "sala": "Anf. C1", "vagas": 60},
                ],
            },
        ]

        for d in disciplinas:
            turmas_data = d.pop("turmas")
            disciplina = Disciplina(**d)
            db.add(disciplina)
            db.flush()
            for t in turmas_data:
                turma = Turma(disciplina_id=disciplina.id, **t)
                db.add(turma)

        db.commit()
    finally:
        db.close()
