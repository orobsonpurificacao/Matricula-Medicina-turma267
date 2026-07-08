# Matrícula Medicina — Turma 267

Sistema web de inscrição em disciplinas com escalonamento por Coeficiente de Rendimento (CR), desenvolvido para a turma 267 do curso de Medicina da UFBA.

---

## Problema que resolve

O processo de escolha de turmas práticas na UFBA envolve disputa por vagas limitadas. Este sistema automatiza a priorização: alunos se inscrevem nas disciplinas desejadas, e um algoritmo de escalonamento aloca as vagas em ordem decrescente de CR — garantindo transparência e justiça no processo.

---

## Funcionalidades

- Cadastro de alunos com matrícula, e-mail, CR e upload do comprovante de matrícula
- Painel interativo de disciplinas com turmas reais do SIGAA UFBA 2026.2
- Grade de horários visual gerada automaticamente a partir dos códigos do SIGAA
- Detecção de conflitos de horário em tempo real
- Escalonamento por CR com tratamento de empate por data de inscrição
- Período de inscrição controlado pelo admin (abertura/fechamento)
- Painel administrativo para validação de comprovantes e execução do escalonamento
- Segunda rodada de escalonamento para alunos em fila escolherem turma alternativa

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Banco de dados | PostgreSQL (produção) / SQLite (desenvolvimento) |
| ORM | SQLAlchemy 2.0 |
| Validação | Pydantic v2 |
| Frontend | React + Tailwind CSS |
| Deploy | Docker + Docker Compose |
| Proxy reverso | Nginx |

---

## Algoritmo de escalonamento

```
Para cada turma prática com inscrições pendentes:
  1. Ordena alunos por CR (decrescente)
  2. Empate: quem se inscreveu primeiro tem prioridade
  3. Aloca até o limite de vagas → status "alocado"
  4. Restante → status "fila" (pode escolher turma alternativa)

Segunda rodada (após escolha de alternativa):
  Repete o mesmo algoritmo para inscrições alternativas pendentes
```

---

## Como rodar localmente

```bash
# Clonar
git clone https://github.com/orobsonpurificacao/Matricula-Medicina-turma267.git
cd Matricula-Medicina-turma267

# Subir com Docker
docker-compose up --build

# Ou rodar direto com Python
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API disponível em `http://localhost:8000`
Documentação automática em `http://localhost:8000/docs`

---

## Estrutura do projeto

```
app/
├── main.py              # Aplicação FastAPI + CORS + rotas
├── database.py          # Configuração do banco + seed de disciplinas
├── escalonamento.py     # Algoritmo de escalonamento por CR
├── models/              # Modelos SQLAlchemy (Aluno, Disciplina, Turma, Inscrição)
├── schemas/             # Schemas Pydantic para validação
└── routers/
    ├── alunos.py        # Cadastro, upload comprovante, validação admin
    ├── disciplinas.py   # Listagem de disciplinas e turmas
    ├── inscricoes.py    # Inscrição, resultado, turma alternativa
    └── admin.py         # Execução do escalonamento
```

---

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| POST | `/alunos/` | Cadastro com upload de comprovante |
| PATCH | `/admin/{id}/validar` | Validar comprovante manualmente |
| GET | `/disciplinas/` | Listar disciplinas com turmas e vagas |
| POST | `/inscricoes/{matricula}` | Aluno escolhe turmas |
| POST | `/admin/escalonar` | Executar escalonamento por CR |
| POST | `/inscricoes/alternativa/escolher` | Escolher turma alternativa (fila) |

---

## Contexto

Projeto desenvolvido como ferramenta real para uso da Turma 267 de Medicina da UFBA (currículo 2022.2), contemplando as disciplinas do 2º, 3º e 4º semestres ofertadas no período 2026.2.

Também compõe o portfólio de desenvolvimento full-stack do autor, demonstrando integração entre FastAPI, SQLAlchemy, lógica de negócio (escalonamento), e deploy com Docker.

---

## Autor

**Robson Purificação**
Estudante de Medicina (UFBA) · Bolsista Fiocruz Bahia · Desenvolvedor
[LinkedIn](https://linkedin.com/in/robson-purificacao) · [GitHub](https://github.com/orobsonpurificacao)
