import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { disciplinaService } from "../services/api"
import { horariosConflitam } from "../utils/grade"
import GradeHoraria from "../components/GradeHoraria"

const CORES = [
  "#F97316", "#378ADD", "#1D9E75", "#D4537E",
  "#7F77DD", "#5DCAA5", "#E24B4A", "#BA7517",
]

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [abertas, setAbertas] = useState({})           // disciplina aberta/fechada
  const [semestresAbertos, setSemestresAbertos] = useState({})
  const [escolhas, setEscolhas] = useState({})          // { discId: turmaId }
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")

  useEffect(() => {
    disciplinaService.listar().then(res => {
      setDisciplinas(res.data)
      setLoading(false)

      // Abre por padrão só o semestre mais baixo, o resto some até o aluno clicar
      const semestres = [...new Set(res.data.map(d => d.semestre || 0))].sort((a, b) => a - b)
      if (semestres.length > 0) {
        setSemestresAbertos({ [semestres[0]]: true })
      }
    }).catch(() => setLoading(false))
  }, [])

  function toggleDisc(id) {
    setAbertas(a => ({ ...a, [id]: !a[id] }))
  }

  function toggleSemestre(sem) {
    setSemestresAbertos(s => ({ ...s, [sem]: !s[sem] }))
  }

  function escolher(discId, turmaId) {
    setEscolhas(e => {
      if (e[discId] === turmaId) {
        const novo = { ...e }
        delete novo[discId]
        return novo
      }
      return { ...e, [discId]: turmaId }
    })
  }

  function handleConfirmar() {
    const selecionadas = Object.entries(escolhas).map(([discId, turmaId]) => ({
      discId: parseInt(discId),
      turmaId
    }))
    localStorage.setItem("escolhas", JSON.stringify(selecionadas))
    localStorage.setItem("disciplinas_data", JSON.stringify(disciplinas))
    navigate("/confirmacao")
  }

  const total = Object.keys(escolhas).length

  // Agrupa por semestre
  const porSemestre = disciplinas.reduce((acc, d) => {
    const sem = d.semestre || 0
    if (!acc[sem]) acc[sem] = []
    acc[sem].push(d)
    return acc
  }, {})

  const praticasDaDisc = (d) => d.turmas?.filter(t => t.tipo === "P") || []
  const teoricasDaDisc = (d) => d.turmas?.filter(t => t.tipo === "T") || []
  const apenasTeoricas = (d) => praticasDaDisc(d).length === 0

  // Lista de tudo que está selecionado, com disciplina + turma resolvidas
  const selecionadasList = useMemo(() => {
    return Object.entries(escolhas).map(([discId, turmaId]) => {
      const d = disciplinas.find(x => x.id === parseInt(discId))
      const t = d?.turmas?.find(x => x.id === turmaId)
      return d && t ? { disciplina: d, turma: t } : null
    }).filter(Boolean)
  }, [escolhas, disciplinas])

  // Detecção de conflito: compara toda escolha contra toda outra escolha
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

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <p className="text-sm text-slate-500">Carregando disciplinas...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-700">
            {aluno.nome?.charAt(0) || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{aluno.nome}</p>
            <p className="text-xs text-slate-500">CR {aluno.cr} · Mat. {aluno.matricula}</p>
          </div>
          <button
            onClick={() => navigate("/escalonamento")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Ver escalonamento
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            Painel do Administrador
          </button>
          <div className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            CR {aluno.cr}
          </div>
        </div>
      </header>

      {/* Prazo */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center">
        <span className="text-xs text-amber-700">
          ⏰ Inscrições encerram em <strong>19/08/2026 às 23:59</strong>
        </span>
      </div>

      {/* Aviso de conflito, fixo enquanto existir */}
      {temConflito && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-center">
          <span className="text-xs font-medium text-red-700">
            ⚠ Conflito de horário entre disciplinas selecionadas — revise antes de confirmar.
          </span>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-5">

        {/* Lista de disciplinas */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Disciplinas disponíveis
            </span>
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-orange-600">{total}</span> selecionada{total !== 1 ? "s" : ""}
            </span>
          </div>

          {Object.entries(porSemestre).sort(([a], [b]) => a - b).map(([sem, discs]) => {
              const semAberto = !!semestresAbertos[sem]
              const escolhidasNoSemestre = discs.filter(d => escolhas[d.id]).length

              return (
                <div key={sem} className="mb-3">
                  <button
                    onClick={() => toggleSemestre(sem)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {sem}º Semestre
                      <span className="ml-2 font-normal normal-case text-slate-400">
                        {discs.length} disciplina{discs.length !== 1 ? "s" : ""}
                        {escolhidasNoSemestre > 0 && ` · ${escolhidasNoSemestre} escolhida${escolhidasNoSemestre !== 1 ? "s" : ""}`}
                      </span>
                    </span>
                    <span className={`text-slate-400 transition-transform ${semAberto ? "rotate-180" : ""}`}>▾</span>
                  </button>

                  {semAberto && (
                    <div className="mt-2 flex flex-col gap-2">
                      {discs.map((d, idx) => {
                        const cor = CORES[idx % CORES.length]
                        const isOpen = abertas[d.id]
                        const escolhida = escolhas[d.id]
                        const turmasEscalonadas = apenasTeoricas(d) ? teoricasDaDisc(d) : praticasDaDisc(d)
                        const turmaEscolhida = d.turmas?.find(t => t.id === escolhida)
                        const conflitosDaEscolha = escolhida ? conflitosPorTurma[escolhida] : null

                        return (
                          <div key={d.id}
                            className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${
                              conflitosDaEscolha
                                ? "border-red-300 bg-red-50"
                                : escolhida
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-slate-200 bg-white"
                            }`}>

                            {/* Cabeçalho do card */}
                            <div className="flex cursor-pointer items-center gap-2.5 p-3" onClick={() => toggleDisc(d.id)}>
                              <div className="h-9 w-1 shrink-0 rounded-full" style={{ background: cor }} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">{d.nome}</p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="text-xs text-slate-500">{d.codigo}</span>
                                  {turmaEscolhida ? (
                                    <span className="text-xs font-medium text-orange-700">
                                      ✓ Turma {turmaEscolhida.numero} — {turmaEscolhida.horario.split("/")[0]}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      {turmasEscalonadas.length} turma{turmasEscalonadas.length !== 1 ? "s" : ""}
                                      {apenasTeoricas(d) ? " (teórica)" : " (prática)"}
                                    </span>
                                  )}
                                  {conflitosDaEscolha && (
                                    <span className="text-xs font-medium text-red-600">
                                      ⚠ conflita com {conflitosDaEscolha.join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-sm text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                            </div>

                            {/* Turmas */}
                            {isOpen && (
                              <div className="flex flex-col gap-1.5 border-t border-slate-100 p-2">
                                {turmasEscalonadas.map(t => {
                                  const selecionada = escolhida === t.id
                                  const conflitaSeSelecionada = selecionadasList.some(s =>
                                    s.disciplina.id !== d.id && horariosConflitam(s.turma.horario, t.horario)
                                  )
                                  return (
                                    <div key={t.id}
                                      onClick={() => escolher(d.id, t.id)}
                                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                        selecionada
                                          ? conflitosDaEscolha
                                            ? "border-red-300 bg-red-50"
                                            : "border-orange-300 bg-orange-50"
                                          : "border-slate-200 bg-slate-50 hover:border-orange-300"
                                      }`}>
                                      <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
                                        selecionada ? "border-orange-500 bg-orange-500" : "border-slate-300"
                                      }`}>
                                        {selecionada && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-slate-700">
                                          Turma {t.numero} — {t.horario}
                                          {!selecionada && conflitaSeSelecionada && (
                                            <span className="ml-1.5 text-red-500">⚠ conflita com sua grade</span>
                                          )}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">{t.professor}</p>
                                      </div>
                                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                                        t.vagas - t.vagas_ocupadas <= 3
                                          ? "border-amber-200 bg-amber-50 text-amber-700"
                                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      }`}>
                                        {t.vagas - t.vagas_ocupadas} vagas
                                      </span>
                                    </div>
                                  )
                                })}
                                {!apenasTeoricas(d) && teoricasDaDisc(d).length > 0 && (
                                  <p className="px-1 pt-1 text-xs text-slate-400">
                                    ℹ Teórica alocada automaticamente com a prática
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Grade — largura total, no final da página, com rolagem horizontal pro mobile */}
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sua grade de horários
            </p>
            <GradeHoraria itens={itensGrade} />
          </div>
        </div>

      {/* Footer */}
      <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={handleConfirmar}
            disabled={total === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirmar inscrição ({total} disciplina{total !== 1 ? "s" : ""})
          </button>
          {temConflito && (
            <p className="mt-1.5 text-center text-xs text-red-600">
              Você tem conflitos de horário na sua seleção. Pode confirmar mesmo assim, mas revise antes.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
