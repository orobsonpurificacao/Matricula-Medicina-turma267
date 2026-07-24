import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { inscricaoService, disciplinaService } from "../services/api"
import GradeHoraria from "../components/GradeHoraria"

const CORES = [
  "#F97316", "#378ADD", "#1D9E75", "#D4537E",
  "#7F77DD", "#5DCAA5", "#E24B4A", "#BA7517",
]

const STATUS_INFO = {
  pendente: { label: "Aguardando", cor: "border-slate-200 bg-slate-50 text-slate-600" },
  alocado: { label: "Alocado", cor: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  fila: { label: "Não alocado", cor: "border-amber-200 bg-amber-50 text-amber-700" },
  alternativa_pendente: { label: "Alternativa", cor: "border-amber-200 bg-amber-50 text-amber-700" },
}

export default function Home() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")
  const [inscricoes, setInscricoes] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      inscricaoService.minhas(aluno.matricula),
      disciplinaService.listar(),
    ]).then(([insRes, discRes]) => {
      setInscricoes(insRes.data)
      setDisciplinas(discRes.data)
      setLoading(false)
    }).catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const discPorTurmaId = useMemo(() => {
    const mapa = {}
    for (const d of disciplinas) {
      for (const t of d.turmas || []) mapa[t.id] = d
    }
    return mapa
  }, [disciplinas])

  const itensResolvidos = inscricoes.map(i => ({
    inscricao: i,
    disciplina: discPorTurmaId[i.turma_id] || null,
  }))

  const itensGrade = itensResolvidos
    .filter(x => x.disciplina)
    .map((x, idx) => ({
      turma: x.inscricao.turma,
      disciplinaNome: x.disciplina.nome + (x.inscricao.turma.tipo === "T" ? " (T)" : ""),
      cor: CORES[idx % CORES.length],
      conflito: false,
    }))

  function sair() {
    localStorage.removeItem("aluno")
    navigate("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-700">
            {aluno.nome?.charAt(0) || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{aluno.nome}</p>
            <p className="text-xs text-slate-500">CR {aluno.cr} · Mat. {aluno.matricula}</p>
          </div>
          {aluno.is_admin && (
            <button
              onClick={() => navigate("/admin")}
              className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              Painel do Administrador
            </button>
          )}
          <button
            onClick={() => navigate("/trocar-senha")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Trocar senha
          </button>
          <button
            onClick={sair}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">

        <div className="mb-6">
          <p className="text-lg font-semibold text-slate-800">Olá, {aluno.nome?.split(" ")[0]}</p>
          <p className="text-sm text-slate-500">Turma 267 — Medicina UFBA</p>
        </div>

        {/* Resumo das disciplinas */}
        {itensResolvidos.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Suas disciplinas
            </p>
            <div className="flex flex-col gap-2">
              {itensResolvidos.map((x, idx) => {
                const info = STATUS_INFO[x.inscricao.status] || STATUS_INFO.pendente
                return (
                  <div key={x.inscricao.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="h-9 w-1 shrink-0 rounded-full" style={{ background: CORES[idx % CORES.length] }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {x.disciplina?.nome || "Disciplina"}
                        {x.inscricao.turma.tipo === "T" && <span className="text-slate-400"> (teórica)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        Turma {x.inscricao.turma.numero} — {x.inscricao.turma.horario}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${info.cor}`}>
                      {info.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Grade — em branco pra quem ainda não escolheu nenhuma turma */}
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sua grade de horários
          </p>
          <GradeHoraria itens={itensGrade} />
        </div>

        {/* Ações — embaixo da grade */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => navigate("/disciplinas")}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-orange-300"
          >
            <span className="text-xl">✏️</span>
            <span className="text-xs font-medium text-slate-700">Alterar/Escolher turmas</span>
          </button>
          <button
            onClick={() => navigate("/escalonamento")}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-orange-300"
          >
            <span className="text-xl">📋</span>
            <span className="text-xs font-medium text-slate-700">Consulte a lista com o escalonamento</span>
          </button>
          <button
            onClick={() => navigate("/alocacao")}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-orange-300"
          >
            <span className="text-xl">🏫</span>
            <span className="text-xs font-medium text-slate-700">Consulte a alocação</span>
          </button>
          <a
            href="https://sigaa.ufba.br/sigaa/public/home.jsf"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-orange-300"
          >
            <span className="text-xl">🔗</span>
            <span className="text-xs font-medium text-slate-700">Consulte o SIGAA</span>
          </a>
        </div>
      </div>
    </div>
  )
}
