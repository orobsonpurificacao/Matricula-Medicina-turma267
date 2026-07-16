import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Disciplina, Turma

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./matricula.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
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
    _seed_periodo()


def _seed_periodo():
    """Garante que a linha singleton de PeriodoInscricao existe (id=1, fechado por padrão)."""
    from app.models import PeriodoInscricao
    db = SessionLocal()
    try:
        if not db.query(PeriodoInscricao).filter(PeriodoInscricao.id == 1).first():
            db.add(PeriodoInscricao(id=1, aberto=False))
            db.commit()
    finally:
        db.close()


def _horario(sigaa: str) -> str:
    """Converte código SIGAA para texto legível.
    Ex: '6T23' → 'Sex 13:55–15:40'
        '35M34' → 'Ter/Qui 08:50–10:35'
    """
    DIAS = {'2':'Seg','3':'Ter','4':'Qua','5':'Qui','6':'Sex'}
    M = ['07:00','07:55','08:50','09:45','10:40','11:35']
    T = ['13:00','13:55','14:50','15:45','16:40','17:35']
    N = ['18:30','19:25','20:20','21:15']

    def fim(inicio):
        h, m = map(int, inicio.split(':'))
        total = h * 60 + m + 50
        return f"{total//60:02d}:{total%60:02d}"

    results = []
    for parte in sigaa.strip().split():
        import re
        m = re.match(r'^(\d+)([MTN])(\d+)$', parte)
        if not m:
            results.append(parte)
            continue
        dias_str, turno, slots_str = m.group(1), m.group(2), m.group(3)
        dias = '/'.join(DIAS.get(d, d) for d in dias_str)
        tabela = {'M': M, 'T': T, 'N': N}[turno]
        slots = [int(s) for s in slots_str]
        h_ini = tabela[slots[0] - 1]
        h_fim = fim(tabela[slots[-1] - 1])
        results.append(f"{dias} {h_ini}–{h_fim}")
    return ' / '.join(results)


def _seed_disciplinas():
    """Seed com disciplinas reais SIGAA UFBA 2026.2 — 2º, 3º e 4º semestre.

    Regras:
    - Disciplinas só com turmas teóricas → escalonamento normal pela teórica
    - Disciplinas com prática + teórica → apenas práticas entram no escalonamento
    - tipo_turma: 'P' = prática (escalonada) | 'T' = teórica (automática)
    """
    db = SessionLocal()
    try:
        if db.query(Disciplina).count() > 0:
            return

        disciplinas = [

            # ── 2º SEMESTRE ───────────────────────────────────────────────────
            {
                "codigo": "ICSG03", "semestre": 2,
                "nome": "Biofísica III A",
                "descricao": "Biofísica aplicada à medicina",
                "turmas": [
                    # Práticas — escalonadas
                    {"num":"01","professor":"Simone Garcia Macambira","horario_sigaa":"2M3","tipo":"P","vagas":15},
                    {"num":"02","professor":"Marcia Barbosa da Silva","horario_sigaa":"2M3","tipo":"P","vagas":15},
                    {"num":"03","professor":"Simone Garcia Macambira","horario_sigaa":"2M4","tipo":"P","vagas":15},
                    {"num":"04","professor":"Marcia Barbosa da Silva","horario_sigaa":"2M4","tipo":"P","vagas":15},
                    {"num":"05","professor":"Simone Garcia Macambira","horario_sigaa":"2M5","tipo":"P","vagas":14},
                    {"num":"06","professor":"Marcia Barbosa da Silva","horario_sigaa":"2M5","tipo":"P","vagas":14},
                    # Teórica — automática
                    {"num":"T01","professor":"Simone Garcia Macambira","horario_sigaa":"2M12","tipo":"T","vagas":88},
                ],
            },
            {
                "codigo": "ICSG07", "semestre": 2,
                "nome": "Anatomia de Sistemas II",
                "descricao": "Anatomia dos sistemas corporais — segundo módulo",
                "turmas": [
                    {"num":"01","professor":"Marion Alves do Nascimento","horario_sigaa":"6T23","tipo":"P","vagas":15},
                    {"num":"02","professor":"Maise Mendonça Amorim","horario_sigaa":"6T23","tipo":"P","vagas":15},
                    {"num":"03","professor":"Vinicius Rio Verde Melo Muniz","horario_sigaa":"6T23","tipo":"P","vagas":15},
                    {"num":"04","professor":"Marion Alves do Nascimento","horario_sigaa":"6T45","tipo":"P","vagas":15},
                    {"num":"05","professor":"Maise Mendonça Amorim","horario_sigaa":"6T45","tipo":"P","vagas":15},
                    {"num":"06","professor":"Vinicius Rio Verde Melo Muniz","horario_sigaa":"6T45","tipo":"P","vagas":15},
                    {"num":"T01","professor":"Adelmir de Souza Machado","horario_sigaa":"3M12","tipo":"T","vagas":90},
                ],
            },
            {
                "codigo": "ICSG06", "semestre": 2,
                "nome": "Fisiologia Médica Geral I A",
                "descricao": "Fisiologia geral — primeiro módulo",
                "turmas": [
                    {"num":"01","professor":"Luciana Mattos Barros Oliveira","horario_sigaa":"2T34","tipo":"P","vagas":18},
                    {"num":"02","professor":"Monica Serra","horario_sigaa":"2T34","tipo":"P","vagas":17},
                    {"num":"03","professor":"Luciana Mattos Barros Oliveira","horario_sigaa":"4M56","tipo":"P","vagas":18},
                    {"num":"04","professor":"Darizy Flavia Silva Amorim de Vasconcelos","horario_sigaa":"4M56","tipo":"P","vagas":17},
                    {"num":"05","professor":"Darizy Flavia Silva Amorim de Vasconcelos","horario_sigaa":"4M12","tipo":"P","vagas":18},
                    {"num":"T01","professor":"Luciana Mattos Barros Oliveira","horario_sigaa":"4M34 2T12","tipo":"T","vagas":88},
                ],
            },
            {
                "codigo": "MEDD81", "semestre": 2,
                "nome": "Epidemiologia",
                "descricao": "Epidemiologia básica e métodos em saúde coletiva",
                "turmas": [
                    # Só teóricas — escalonamento normal
                    {"num":"01","professor":"Guilherme de Sousa Ribeiro","horario_sigaa":"5T2345","tipo":"T","vagas":16},
                    {"num":"02","professor":"Jorgana Fernanda de Souza Soares","horario_sigaa":"5T2345","tipo":"T","vagas":16},
                    {"num":"03","professor":"Kionna Oliveira Bernardes Santos","horario_sigaa":"5T2345","tipo":"T","vagas":16},
                    {"num":"04","professor":"Fernando Ribas Feijo","horario_sigaa":"5T2345","tipo":"T","vagas":16},
                    {"num":"05","professor":"Rita de Cassia Pereira Fernandes","horario_sigaa":"5T2345","tipo":"T","vagas":16},
                ],
            },
            {
                "codigo": "MEDD82", "semestre": 2,
                "nome": "Pediatria I",
                "descricao": "Introdução à pediatria",
                "turmas": [
                    {"num":"01","professor":"A definir","horario_sigaa":"3M456","tipo":"T","vagas":54},
                    {"num":"02","professor":"A definir","horario_sigaa":"5M456","tipo":"T","vagas":54},
                ],
            },
            {
                "codigo": "MEDD83", "semestre": 2,
                "nome": "Bioética e Ética Médica II",
                "descricao": "Bioética — segundo módulo",
                "turmas": [
                    {"num":"01","professor":"Liliane Elze Falcão Lins Kusterer","horario_sigaa":"6M56","tipo":"T","vagas":31},
                    {"num":"02","professor":"Liliane Elze Falcão Lins Kusterer","horario_sigaa":"6T12","tipo":"T","vagas":31},
                    {"num":"03","professor":"Camila Vasconcelos de Oliveira","horario_sigaa":"6T12","tipo":"T","vagas":30},
                ],
            },
            {
                "codigo": "MEDD84", "semestre": 2,
                "nome": "Formação em Pesquisa I A",
                "descricao": "Iniciação científica e metodologia de pesquisa",
                "turmas": [
                    {"num":"01","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"2M4","tipo":"P","vagas":13},
                    {"num":"02","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"2M6","tipo":"P","vagas":13},
                    {"num":"03","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"3T2","tipo":"P","vagas":14},
                    {"num":"04","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"3T4","tipo":"P","vagas":14},
                    {"num":"06","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"6M4","tipo":"P","vagas":13},
                    {"num":"07","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"6M6","tipo":"P","vagas":13},
                    {"num":"T01","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"2M3","tipo":"T","vagas":13},
                    {"num":"T02","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"2M5","tipo":"T","vagas":13},
                    {"num":"T03","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"3T1","tipo":"T","vagas":14},
                    {"num":"T04","professor":"Bianca Ramos Mesquita / Antonio Ricardo Khouri Cunha","horario_sigaa":"3T3","tipo":"T","vagas":14},
                ],
            },

            # ── 3º SEMESTRE ───────────────────────────────────────────────────
            {
                "codigo": "ICSG09", "semestre": 3,
                "nome": "Bioquímica Médica II A",
                "descricao": "Bioquímica médica avançada",
                "turmas": [
                    # Só teóricas
                    {"num":"01","professor":"Maria de Fatima Dias Costa / Barbara de Castro Pimentel Figueiredo","horario_sigaa":"4M56","tipo":"T","vagas":44},
                    {"num":"02","professor":"Maria de Fatima Dias Costa / Barbara de Castro Pimentel Figueiredo","horario_sigaa":"6T12","tipo":"T","vagas":44},
                ],
            },
            {
                "codigo": "ICSG10", "semestre": 3,
                "nome": "Fisiologia dos Órgãos e Sistemas A",
                "descricao": "Fisiologia dos principais sistemas orgânicos",
                "turmas": [
                    {"num":"01","professor":"Samira Itana de Souza","horario_sigaa":"3M56","tipo":"P","vagas":18},
                    {"num":"02","professor":"Helton Estrela Ramos","horario_sigaa":"3M56","tipo":"P","vagas":17},
                    {"num":"03","professor":"Paula Cristina Alves Araujo","horario_sigaa":"5M56","tipo":"P","vagas":18},
                    {"num":"04","professor":"Helton Estrela Ramos","horario_sigaa":"5M56","tipo":"P","vagas":17},
                    {"num":"05","professor":"Samira Itana de Souza","horario_sigaa":"3M12","tipo":"P","vagas":18},
                    {"num":"T01","professor":"Helton Estrela Ramos / Samira Itana de Souza","horario_sigaa":"35M34","tipo":"T","vagas":88},
                ],
            },
            {
                "codigo": "ICSG11", "semestre": 3,
                "nome": "Anatomia de Sistemas III",
                "descricao": "Anatomia dos sistemas corporais — terceiro módulo",
                "turmas": [
                    {"num":"01","professor":"A definir","horario_sigaa":"4M56","tipo":"P","vagas":15},
                    {"num":"02","professor":"Amanda Araújo de Carvalho","horario_sigaa":"4M56","tipo":"P","vagas":15},
                    {"num":"03","professor":"Marion Alves do Nascimento","horario_sigaa":"4M56","tipo":"P","vagas":15},
                    {"num":"04","professor":"A definir","horario_sigaa":"4T12","tipo":"P","vagas":15},
                    {"num":"05","professor":"Amanda Araújo de Carvalho","horario_sigaa":"4T12","tipo":"P","vagas":15},
                    {"num":"06","professor":"Marion Alves do Nascimento","horario_sigaa":"4T12","tipo":"P","vagas":15},
                    {"num":"T01","professor":"Adelmir de Souza Machado","horario_sigaa":"6M56","tipo":"T","vagas":90},
                ],
            },
            {
                "codigo": "MEDD85", "semestre": 3,
                "nome": "Semiologia Médica",
                "descricao": "Anamnese, exame físico e raciocínio clínico",
                "turmas": [
                    {"num":"01","professor":"Lisia Marcilio Rabelo","horario_sigaa":"24M1234 6M123","tipo":"P","vagas":15},
                    {"num":"02","professor":"Rodrigo Merces Weyll Pimentel","horario_sigaa":"24M1234 6M123","tipo":"P","vagas":15},
                    {"num":"03","professor":"Ana Thereza Cavalcanti Rocha","horario_sigaa":"24M1234 6M123","tipo":"P","vagas":15},
                    {"num":"04","professor":"Ana Claudia Couto Santos da Silva","horario_sigaa":"24M1234 6M123","tipo":"P","vagas":15},
                    {"num":"05","professor":"Clarissa de Castro Carvalho Pedreira","horario_sigaa":"24M1234 6M123","tipo":"P","vagas":15},
                    {"num":"06","professor":"Silvania Brunelly Lima da Silva","horario_sigaa":"24M1234 6M123","tipo":"P","vagas":15},
                ],
            },
            {
                "codigo": "MEDD86", "semestre": 3,
                "nome": "Medicina Social I",
                "descricao": "Determinantes sociais da saúde e SUS",
                "turmas": [
                    {"num":"01","professor":"Jose Luiz Moreno Neto / Fernando Donato Vasconcelos","horario_sigaa":"3T345","tipo":"P","vagas":13},
                    {"num":"02","professor":"Sumaia Boaventura Andre","horario_sigaa":"3T345","tipo":"P","vagas":13},
                    {"num":"03","professor":"Anny Karoliny das Chagas Bandeira","horario_sigaa":"3T345","tipo":"P","vagas":13},
                    {"num":"04","professor":"Anny Karoliny das Chagas Bandeira","horario_sigaa":"5T345","tipo":"P","vagas":13},
                    {"num":"05","professor":"Jose Luiz Moreno Neto / Fernando Donato Vasconcelos","horario_sigaa":"5T345","tipo":"P","vagas":13},
                    {"num":"06","professor":"Sumaia Boaventura Andre","horario_sigaa":"5T345","tipo":"P","vagas":12},
                    {"num":"07","professor":"Ericka Souza Browne","horario_sigaa":"3T345","tipo":"P","vagas":13},
                    {"num":"T01","professor":"Jose Luiz Moreno Neto / Fernando Donato Vasconcelos","horario_sigaa":"3T12","tipo":"T","vagas":13},
                    {"num":"T02","professor":"Sumaia Boaventura Andre","horario_sigaa":"3T12","tipo":"T","vagas":13},
                    {"num":"T04","professor":"Anny Karoliny das Chagas Bandeira","horario_sigaa":"5T12","tipo":"T","vagas":13},
                    {"num":"T07","professor":"Ericka Souza Browne","horario_sigaa":"5T12","tipo":"T","vagas":13},
                ],
            },
            {
                "codigo": "MEDD87", "semestre": 3,
                "nome": "Bioética e Ética Médica III A",
                "descricao": "Bioética — terceiro módulo",
                "turmas": [
                    {"num":"01","professor":"Claudia Bacelar Batista","horario_sigaa":"2T345","tipo":"T","vagas":41},
                    {"num":"02","professor":"Camila Vasconcelos de Oliveira","horario_sigaa":"2T345","tipo":"T","vagas":41},
                ],
            },

            # ── 4º SEMESTRE ───────────────────────────────────────────────────
            {
                "codigo": "ICSG12", "semestre": 4,
                "nome": "Parasitologia Humana II A",
                "descricao": "Parasitologia clínica aplicada",
                "turmas": [
                    {"num":"01","professor":"Nicolaus Albert Borges Schriefer","horario_sigaa":"2M56","tipo":"P","vagas":12},
                    {"num":"02","professor":"Adriano Figueiredo Monte Alegre","horario_sigaa":"2M56","tipo":"P","vagas":12},
                    {"num":"03","professor":"A definir","horario_sigaa":"2M56","tipo":"P","vagas":12},
                    {"num":"04","professor":"Natalia Gomes de Morais Coneglian","horario_sigaa":"2M56","tipo":"P","vagas":12},
                    {"num":"05","professor":"Nicolaus Albert Borges Schriefer","horario_sigaa":"2T34","tipo":"P","vagas":12},
                    {"num":"06","professor":"Adriano Figueiredo Monte Alegre","horario_sigaa":"2T34","tipo":"P","vagas":12},
                    {"num":"07","professor":"A definir","horario_sigaa":"2T34","tipo":"P","vagas":12},
                    {"num":"08","professor":"Natalia Gomes de Morais Coneglian","horario_sigaa":"2T34","tipo":"P","vagas":12},
                    {"num":"T01","professor":"Nicolaus Albert Borges Schriefer / Natalia Gomes de Morais Coneglian","horario_sigaa":"6T1","tipo":"T","vagas":96},
                ],
            },
            {
                "codigo": "ICSG13", "semestre": 4,
                "nome": "Farmacologia I",
                "descricao": "Fundamentos de farmacologia clínica",
                "turmas": [
                    {"num":"01","professor":"Tatiane de Oliveira Teixeira Muniz Carletto","horario_sigaa":"3M34","tipo":"P","vagas":22},
                    {"num":"02","professor":"Tatiane de Oliveira Teixeira Muniz Carletto","horario_sigaa":"3M56","tipo":"P","vagas":22},
                    {"num":"03","professor":"Eduardo Pondé de Sena","horario_sigaa":"5M23","tipo":"P","vagas":22},
                    {"num":"04","professor":"Camila Alexandrina Viana de Figueiredo Fontana","horario_sigaa":"5M45","tipo":"P","vagas":22},
                    {"num":"T01","professor":"Camila Alexandrina Viana de Figueiredo Fontana","horario_sigaa":"4M56","tipo":"T","vagas":88},
                ],
            },
            {
                "codigo": "ICSG14", "semestre": 4,
                "nome": "Microbiologia V A",
                "descricao": "Microbiologia clínica aplicada",
                "turmas": [
                    {"num":"01","professor":"Nilse Nelia Querino Santos / Samira Abdallah Hanna","horario_sigaa":"4T2 5T1","tipo":"P","vagas":11},
                    {"num":"02","professor":"Nilse Nelia Querino Santos / Samira Abdallah Hanna","horario_sigaa":"4T2 5T1","tipo":"P","vagas":11},
                    {"num":"03","professor":"Adriano de Souza Santos Monteiro / Luana Leandro Gois","horario_sigaa":"4T3 5T2","tipo":"P","vagas":11},
                    {"num":"04","professor":"Adriano de Souza Santos Monteiro / Luana Leandro Gois","horario_sigaa":"4T3 5T2","tipo":"P","vagas":11},
                    {"num":"05","professor":"Nilse Nelia Querino Santos / Samira Abdallah Hanna","horario_sigaa":"4T1 5T2","tipo":"P","vagas":11},
                    {"num":"06","professor":"Nilse Nelia Querino Santos / Samira Abdallah Hanna","horario_sigaa":"4T1 5T2","tipo":"P","vagas":11},
                    {"num":"07","professor":"Adriano de Souza Santos Monteiro / Luana Leandro Gois","horario_sigaa":"4T6 5T1","tipo":"P","vagas":11},
                    {"num":"08","professor":"Adriano de Souza Santos Monteiro / Luana Leandro Gois","horario_sigaa":"4T6 5T1","tipo":"P","vagas":11},
                    {"num":"T01","professor":"Nilse Nelia Querino Santos","horario_sigaa":"5T34","tipo":"T","vagas":44},
                    {"num":"T02","professor":"Luana Leandro Gois","horario_sigaa":"5T34","tipo":"T","vagas":44},
                ],
            },
            {
                "codigo": "ISCA83", "semestre": 4,
                "nome": "Política de Saúde I",
                "descricao": "Políticas públicas de saúde e sistema SUS",
                "turmas": [
                    {"num":"01","professor":"Ana Cristina Souto","horario_sigaa":"6T234","tipo":"T","vagas":15},
                    {"num":"02","professor":"Luis Eugenio Portela Fernandes de Souza","horario_sigaa":"6T234","tipo":"T","vagas":14},
                    {"num":"03","professor":"Samantha Vitena Barbosa","horario_sigaa":"6T234","tipo":"T","vagas":15},
                    {"num":"06","professor":"Mariluce Karla Bomfim de Souza","horario_sigaa":"4T345","tipo":"T","vagas":12},
                    {"num":"07","professor":"Erika Santos de Aragão","horario_sigaa":"4T345","tipo":"T","vagas":12},
                    {"num":"08","professor":"Catharina Leite Matos Soares","horario_sigaa":"4T345","tipo":"T","vagas":12},
                ],
            },
            {
                "codigo": "MEDD88", "semestre": 4,
                "nome": "Medicina de Família e Comunidade I",
                "descricao": "Atenção básica e medicina de família",
                "turmas": [
                    {"num":"02","professor":"Caroline Lopez Fidalgo","horario_sigaa":"25M2345 4M234","tipo":"P","vagas":9},
                    {"num":"03","professor":"Ionara da Rocha Virgens","horario_sigaa":"25M2345 4M234","tipo":"P","vagas":10},
                    {"num":"04","professor":"Lilian Carneiro de Carvalho","horario_sigaa":"36M2345 4M234","tipo":"P","vagas":9},
                    {"num":"05","professor":"Livia Fonseca da Silva Carvalho de Azevedo Santana","horario_sigaa":"25M2345 4M234","tipo":"P","vagas":10},
                    {"num":"06","professor":"Miriam Pinillos Marambaia","horario_sigaa":"25M2345 4M234","tipo":"P","vagas":10},
                    {"num":"07","professor":"Bruna Costa Rodrigues","horario_sigaa":"36M2345 4M234","tipo":"P","vagas":9},
                    {"num":"08","professor":"Gilvandro de Almeida Rosa","horario_sigaa":"36M2345 4M234","tipo":"P","vagas":9},
                    {"num":"09","professor":"Washington Luiz Abreu de Jesus / Diego Espinheira da Costa Bomfim","horario_sigaa":"36M2345 4M234","tipo":"P","vagas":10},
                    {"num":"10","professor":"Gilvandro de Almeida Rosa / Leandro Dominguez Barretto","horario_sigaa":"25M2345 4M234","tipo":"P","vagas":10},
                    {"num":"11","professor":"Bruno Ferreira Franco Laignier / Caroline Lopez Fidalgo","horario_sigaa":"36M2345 4M234","tipo":"P","vagas":10},
                ],
            },
            {
                "codigo": "MEDD89", "semestre": 4,
                "nome": "Imunopatologia",
                "descricao": "Imunologia e fisiopatologia das doenças imunológicas",
                "turmas": [
                    {"num":"01","professor":"Viviane Sampaio Boaventura de Oliveira / Antonio Ricardo Khouri Cunha","horario_sigaa":"2T1234","tipo":"P","vagas":27},
                    {"num":"02","professor":"Bianca Ramos Mesquita","horario_sigaa":"2T1234","tipo":"P","vagas":28},
                    {"num":"03","professor":"Viviane Sampaio Boaventura de Oliveira / Antonio Ricardo Khouri Cunha","horario_sigaa":"4T2345","tipo":"P","vagas":27},
                    {"num":"04","professor":"Bianca Ramos Mesquita","horario_sigaa":"4T2345","tipo":"P","vagas":27},
                    {"num":"T01","professor":"Viviane Sampaio Boaventura de Oliveira / Antonio Ricardo Khouri Cunha","horario_sigaa":"2T5","tipo":"T","vagas":109},
                ],
            },
            {
                "codigo": "MEDD90", "semestre": 4,
                "nome": "Formação em Pesquisa II-A",
                "descricao": "Metodologia científica avançada e pesquisa aplicada",
                "turmas": [
                    {"num":"01","professor":"Guilherme de Sousa Ribeiro","horario_sigaa":"3T2345","tipo":"T","vagas":18},
                    {"num":"02","professor":"Kionna Oliveira Bernardes Santos","horario_sigaa":"3T2345","tipo":"T","vagas":18},
                    {"num":"03","professor":"Jorgana Fernanda de Souza Soares","horario_sigaa":"3T2345","tipo":"T","vagas":18},
                    {"num":"04","professor":"Fernando Ribas Feijo","horario_sigaa":"3T2345","tipo":"T","vagas":18},
                    {"num":"05","professor":"Rita de Cassia Pereira Fernandes","horario_sigaa":"3T2345","tipo":"T","vagas":18},
                ],
            },
        ]

        for d in disciplinas:
            turmas_data = d.pop("turmas")
            sem = d.pop("semestre")
            disc = Disciplina(semestre=sem, creditos=0, **d)
            db.add(disc)
            db.flush()
            for t in turmas_data:
                horario_legivel = _horario(t.pop("horario_sigaa"))
                num = t.pop("num")
                tipo = t.pop("tipo")
                turma = Turma(
                    disciplina_id=disc.id,
                    numero=num,
                    tipo=tipo,
                    horario=horario_legivel,
                    **t
                )
                db.add(turma)

        db.commit()
        print(f"✓ Seed concluído: {db.query(Disciplina).count()} disciplinas, {db.query(Turma).count()} turmas")
    finally:
        db.close()
