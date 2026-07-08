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
    comprovante_path = Column(String(255), nullable=True)
    validado = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

    inscricoes = relationship("Inscricao", back_populates="aluno")


class Disciplina(Base):
    __tablename__ = "disciplinas"

    id = Column(Integer, primary_key=True)
    codigo = Column(String(20), unique=True, nullable=False)
    nome = Column(String(100), nullable=False)
    creditos = Column(Integer, nullable=False)
    descricao = Column(Text, nullable=True)

    turmas = relationship("Turma", back_populates="disciplina")


class Turma(Base):
    __tablename__ = "turmas"

    id = Column(Integer, primary_key=True)
    disciplina_id = Column(Integer, ForeignKey("disciplinas.id"), nullable=False)
    professor = Column(String(100), nullable=False)
    horario = Column(String(100), nullable=False)   # ex: "Seg/Qua 08:00-10:00"
    sala = Column(String(50), nullable=True)
    vagas = Column(Integer, nullable=False)
    vagas_ocupadas = Column(Integer, default=0)

    disciplina = relationship("Disciplina", back_populates="turmas")
    inscricoes = relationship("Inscricao", back_populates="turma")

    @property
    def vagas_disponiveis(self):
        return self.vagas - self.vagas_ocupadas


class Inscricao(Base):
    __tablename__ = "inscricoes"

    id = Column(Integer, primary_key=True)
    aluno_id = Column(Integer, ForeignKey("alunos.id"), nullable=False)
    turma_id = Column(Integer, ForeignKey("turmas.id"), nullable=False)
    prioridade = Column(Integer, nullable=False)  # 1 = primeira escolha, 2 = alternativa
    status = Column(Enum(StatusInscricao), default=StatusInscricao.pendente)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    aluno = relationship("Aluno", back_populates="inscricoes")
    turma = relationship("Turma", back_populates="inscricoes")
