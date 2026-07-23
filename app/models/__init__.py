from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey,
    DateTime, Enum, Text
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class StatusInscricao(str, enum.Enum):
    pendente = "pendente"
    alocado = "alocado"
    fila = "fila"
    alternativa_pendente = "alternativa_pendente"


class Aluno(Base):
    __tablename__ = "alunos"
    id = Column(Integer, primary_key=True)
    matricula = Column(String(20), unique=True, nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    cr = Column(Float, nullable=False)
    senha_hash = Column(String(200), nullable=False)
    comprovante_path = Column(String(255), nullable=True)
    validado = Column(Boolean, default=False)
    recusado = Column(Boolean, default=False)
    motivo_recusa = Column(String(255), nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    prioridade = Column(Boolean, default=False, nullable=False)
    ordem_prioridade = Column(Integer, nullable=True)
    motivo_prioridade = Column(String(255), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    inscricoes = relationship("Inscricao", back_populates="aluno")


class PeriodoInscricao(Base):
    """Singleton (sempre 1 linha, id=1). Controla se alunos podem se inscrever,
    se a tela de escalonamento está liberada, e se a tela de alocação está
    liberada pra consulta."""
    __tablename__ = "periodo_inscricao"
    id = Column(Integer, primary_key=True, default=1)
    aberto = Column(Boolean, default=False, nullable=False)
    escalonamento_liberado = Column(Boolean, default=False, nullable=False)
    alocacao_liberada = Column(Boolean, default=False, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Disciplina(Base):
    __tablename__ = "disciplinas"
    id = Column(Integer, primary_key=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nome = Column(String(150), nullable=False)
    semestre = Column(Integer, nullable=False, default=0)
    creditos = Column(Integer, nullable=False, default=0)
    descricao = Column(Text, nullable=True)
    turmas = relationship("Turma", back_populates="disciplina")


class Turma(Base):
    __tablename__ = "turmas"
    id = Column(Integer, primary_key=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id"), nullable=False)
    numero = Column(String(10), nullable=False, default="01")
    tipo = Column(String(1), nullable=False, default="T")
    professor = Column(String(200), nullable=False)
    horario = Column(String(200), nullable=False)
    sala = Column(String(50), nullable=True)
    vagas = Column(Integer, nullable=False)
    vagas_ocupadas = Column(Integer, default=0)
    vagas_reservadas = Column(Integer, default=0, nullable=False)
    disciplina = relationship("Disciplina", back_populates="turmas")
    inscricoes = relationship("Inscricao", back_populates="turma")
    reservas = relationship("ReservaVaga", back_populates="turma", cascade="all, delete-orphan")


class ReservaVaga(Base):
    """
    Vaga reservada pelo admin pra um estudante que NÃO tem cadastro no
    sistema (ex: repetindo a disciplina, vindo de turma anterior). Não é
    um Aluno de verdade — só um registro com um texto livre (o que o
    admin escrever, ex: "Turma 265") e uma posição (1º, 2º, 3º entre as
    reservas), pra aparecer como linha de verdade na tela de alocação,
    ocupando a vaga visualmente.
    """
    __tablename__ = "reservas_vaga"
    id = Column(Integer, primary_key=True)
    turma_id = Column(Integer, ForeignKey("turmas.id"), nullable=False)
    referencia = Column(String(255), nullable=False)
    posicao = Column(Integer, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    turma = relationship("Turma", back_populates="reservas")

    @property
    def vagas_disponiveis(self):
        return self.vagas - self.vagas_ocupadas


class Inscricao(Base):
    __tablename__ = "inscricoes"
    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    turma_id = Column(Integer, ForeignKey("turmas.id"), nullable=False)
    prioridade = Column(Integer, nullable=False, default=1)
    status = Column(Enum(StatusInscricao), default=StatusInscricao.pendente)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    aluno = relationship("Aluno", back_populates="inscricoes")
    turma = relationship("Turma", back_populates="inscricoes")
