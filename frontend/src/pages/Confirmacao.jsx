import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { inscricaoService } from "../services/api"
import { horariosConflitam } from "../utils/grade"
import GradeHoraria from "../components/GradeHoraria"

const CORES = [
  "#F97316", "#378ADD", "#1D9E75", "#D4537E",
  "#7F77DD", "#5DCAA5", "#E24B4A", "#BA7517",
]

export default function Confirmacao() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState("")

  // Dados salvos pela página de Disciplinas ao clicar em "Confirmar inscrição"
  const { escolhas, disciplinas } = useMemo(() => {
    try {
      const escolhasSalvas = JSON.parse(localStorage.getItem("escolhas") || "[]")
      const disciplinasSalvas = JSON.parse(localStorage.getItem("disciplinas_data") || "[]")
      return { escolhas: escolhasSalvas, disciplinas: disciplinasSalvas }
    } catch {
      return { escolhas: [], disciplinas: [] }
    }
  }, [])

  const selecionadasList = useMemo(() => {
    return escolhas.map(({ discId, turmaId }) => {
      const d = disciplinas.find(x => x.id === discId)
      const t = d?.turmas?.find(x => x.id === turmaId)
      return d && t ? { disciplina: d, turma: t } : null
    }).filter(Boolean)
  }, [escolhas, disciplinas])

  const conflitosPorTurma = useMemo(() => {
    const mapa = {}
    for (let i = 0; i < selecionadasList.length; i++) {
      for (let j = i + 1; j < selecionadasList.length; j++) {
        const a = selecionadasList[i], b = selecionadasList[j]
        if (horariosConflitam(a.turma.horario, b.turma.horario)) {
          mapa[a.turma.id] = [...(mapa[a.turma.id] || []), b.disciplina.nome]
          mapa[b.turma.id] = [...(mapa[b.turma.id] || []), a.disciplina.nome]
        }
      }
    }
    return mapa
  }, [selecionadasList])

  const temConflito = Object.keys(conflitosPorTurma).length > 0

  const itensGrade = selecionadasList.map((s, idx) => ({
    turma: s.turma,
    disciplinaNome: s.disciplina.nome,
    cor: CORES[idx % CORES.length],
    conflito: !!conflitosPorTurma[s.turma.id],
  }))

  async function confirmar() {
    setErro("")
    setEnviando(true)
    try {
      const payload = selecionadasList.map(s => ({ turma_id: s.turma.id, prioridade: 1 }))
      await inscricaoService.inscrever(aluno.matricula, payload)
      localStorage.removeItem("escolhas")
      localStorage.removeItem("disciplinas_data")
      navigate("/resultado")
    } catch (err) {
      setErro(
        err.response?.data?.detail ||
        "Não foi possível confirmar a inscrição. Tente novamente."
      )
    } finally {
      setEnviando(false)
    }
  }

  if (selecionadasList.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-center">
        <p className="text-sm text-slate-600">Nenhuma disciplina selecionada ainda.</p>
        <button
          onClick={() => navigate("/disciplinas")}
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
        >
          Escolher disciplinas
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/disciplinas")}
            className="shrink-0 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Voltar
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-semibold text-slate-800">Confirmar inscrição</p>
            <p className="text-xs text-slate-500">Revise antes de enviar</p>
          </div>
          <div className="w-12 shrink-0" />
        </div>
      </header>

      {temConflito && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center">
          <span className="text-xs font-medium text-red-700">
            ⚠ Você tem conflito de horário na sua seleção — revise antes de confirmar.
          </span>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-5">

        {/* Resumo das disciplinas */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {selecionadasList.length} disciplina{selecionadasList.length !== 1 ? "s" : ""} selecionada{selecionadasList.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-col gap-2">
            {selecionadasList.map((s, idx) => {
              const conflitos = conflitosPorTurma[s.turma.id]
              return (
                <div
                  key={s.turma.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 shadow-sm ${
                    conflitos ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="h-10 w-1 shrink-0 rounded-full" style={{ background: CORES[idx % CORES.length] }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{s.disciplina.nome}</p>
                    <p className="text-xs text-slate-500">
                      {s.disciplina.codigo} · Turma {s.turma.numero} — {s.turma.horario}
                    </p>
                    <p className="text-xs text-slate-500">{s.turma.professor}</p>
                    {conflitos && (
                      <p className="mt-0.5 text-xs font-medium text-red-600">
                        ⚠ conflita com {conflitos.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Grade de revisão */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Grade de horários
          </p>
          <GradeHoraria itens={itensGrade} />
        </div>

        {erro && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={confirmar}
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? "Enviando..." : "Confirmar inscrição"}
          </button>
          {temConflito && (
            <p className="mt-1.5 text-center text-xs text-red-600">
              Você pode confirmar mesmo com conflito, mas revise antes.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
