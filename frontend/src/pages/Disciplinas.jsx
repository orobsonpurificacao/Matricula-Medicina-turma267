import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { disciplinaService, inscricaoService } from "../services/api"
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
  // escolhas: { [discId]: { pratica: turmaId|null, teorica: turmaId|null } }
  const [escolhas, setEscolhas] = useState({})
  // guarda as inscrições que já existiam ao abrir a tela, pra saber depois
  // o que o aluno desmarcou e precisa ser cancelado de verdade no backend
  const [inscricoesOriginais, setInscricoesOriginais] = useState([])
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")

  useEffect(() => {
    Promise.all([
      disciplinaService.listar(),
      inscricaoService.minhas(aluno.matricula).catch(() => ({ data: [] })),
    ]).then(([discRes, insRes]) => {
      setDisciplinas(discRes.data)

      // Pré-carrega o que o aluno já tinha escolhido antes (permite editar).
      // Não conta inscrições em "fila" aqui — essas se resolvem só pela tela
      // de Resultado (escolher alternativa), pra não duplicar inscrição.
      const inicial = {}
      for (const insc of insRes.data) {
        if (insc.status === "fila") continue
        const disc = discRes.data.find(d =>
          d.turmas?.some(t => t.id === insc.turma_id)
        )
        if (!disc) continue
        const turma = disc.turmas.find(t => t.id === insc.turma_id)
        if (!turma) continue
        const campo = turma.tipo === "P" ? "pratica" : "teorica"
        inicial[disc.id] = { ...(inicial[disc.id] || {}), [campo]: turma.id }
      }
      setEscolhas(inicial)
      setInscricoesOriginais(insRes.data.filter(i => i.status !== "fila"))
      setLoading(false)

      const semestres = [...new Set(discRes.data.map(d => d.semestre || 0))].sort((a, b) => a - b)
      if (semestres.length > 0) {
        setSemestresAbertos({ [semestres[0]]: true })
      }
    }).catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleDisc(id) {
    setAbertas(a => ({ ...a, [id]: !a[id] }))
  }

  function toggleSemestre(sem) {
    setSemestresAbertos(s => ({ ...s, [sem]: !s[sem] }))
  }

  const praticasDaDisc = (d) => d.turmas?.filter(t => t.tipo === "P") || []
  const teoricasDaDisc = (d) => d.turmas?.filter(t => t.tipo === "T") || []
  const apenasTeoricas = (d) => praticasDaDisc(d).length === 0

  function escolherPratica(disc, turmaId) {
    setEscolhas(e => {
      const atual = e[disc.id] || {}
      if (atual.pratica === turmaId) {
        // desmarca a prática — e a teórica vinculada junto, já que ela só
        // fazia sentido por causa dessa prática
        const novo = { ...e }
        delete novo[disc.id]
        return novo
      }
      const novaEntrada = { ...atual, pratica: turmaId }
      const teoricas = teoricasDaDisc(disc)
      if (teoricas.length === 1) {
        // única opção — vincula automático, sem o aluno precisar escolher
        novaEntrada.teorica = teoricas[0].id
      }
      return { ...e, [disc.id]: novaEntrada }
    })
  }

  function escolherTeorica(discId, turmaId) {
    setEscolhas(e => {
      const atual = e[discId] || {}
      if (atual.teorica === turmaId) {
        const novo = { ...e, [discId]: { ...atual, teorica: undefined } }
        // se não sobrou nada selecionado nessa disciplina, remove a entrada
        if (!novo[discId].pratica) delete novo[discId]
        return novo
      }
      return { ...e, [discId]: { ...atual, teorica: turmaId } }
    })
  }

  function handleConfirmar() {
    const selecionadas = []
    const turmaIdsSelecionados = new Set()
    for (const [discId, sel] of Object.entries(escolhas)) {
      if (sel.pratica) {
        selecionadas.push({ discId: parseInt(discId), turmaId: sel.pratica })
        turmaIdsSelecionados.add(sel.pratica)
      }
      if (sel.teorica) {
        selecionadas.push({ discId: parseInt(discId), turmaId: sel.teorica })
        turmaIdsSelecionados.add(sel.teorica)
      }
    }

    // Qualquer inscrição que já existia e não está mais entre as turmas
    // selecionadas agora foi desmarcada pelo aluno — precisa ser cancelada
    // de verdade no backend, não só sumir da tela.
    const cancelamentos = inscricoesOriginais
      .filter(i => !turmaIdsSelecionados.has(i.turma_id))
      .map(i => i.id)

    localStorage.setItem("escolhas", JSON.stringify(selecionadas))
    localStorage.setItem("cancelamentos", JSON.stringify(cancelamentos))
    localStorage.setItem("disciplinas_data", JSON.stringify(disciplinas))
    navigate("/confirmacao")
  }

  function sair() {
    localStorage.removeItem("aluno")
    navigate("/")
  }

  const total = Object.keys(escolhas).length

  // Agrupa por semestre
  const porSemestre = disciplinas.reduce((acc, d) => {
    const sem = d.semestre || 0
    if (!acc[sem]) acc[sem] = []
    acc[sem].push(d)
    return acc
  }, {})

  // Lista achatada de tudo que está selecionado (prática E teórica juntas),
  // usada pra grade e detecção de conflito — as duas competem por horário.
  const selecionadasList = useMemo(() => {
    const lista = []
    for (const [discId, sel] of Object.entries(escolhas)) {
      const d = disciplinas.find(x => x.id === parseInt(discId))
      if (!d) continue
      if (sel.pratica) {
        const t = d.turmas.find(x => x.id === sel.pratica)
        if (t) lista.push({ disciplina: d, turma: t, papel: "pratica" })
      }
      if (sel.teorica) {
        const t = d.turmas.find(x => x.id === sel.teorica)
        if (t) lista.push({ disciplina: d, turma: t, papel: "teorica" })
      }
    }
    return lista
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
    disciplinaNome: s.disciplina.nome + (s.papel === "teorica" ? " (T)" : ""),
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
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-700">
            {aluno.nome?.charAt(0) || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{aluno.nome}</p>
            <p className="text-xs text-slate-500">CR {aluno.cr} · Mat. {aluno.matricula}</p>
          </div>
          <button
            onClick={() => navigate("/home")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Início
          </button>
          <button
            onClick={() => navigate("/escalonamento")}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Ver escalonamento
          </button>
          {aluno.is_admin && (
            <button
              onClick={() => navigate("/admin")}
              className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
            >
              Painel do Administrador
            </button>
          )}
          <div className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            CR {aluno.cr}
          </div>
          <button
            onClick={sair}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sair
          </button>
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
                        const sel = escolhas[d.id] || {}
                        const hibrida = !apenasTeoricas(d)
                        const teoricasDisc = teoricasDaDisc(d)
                        const praticasDisc = praticasDaDisc(d)
                        const precisaEscolherTeorica = hibrida && teoricasDisc.length > 1
                        const teoricaFaltando = precisaEscolherTeorica && sel.pratica && !sel.teorica

                        const turmaPraticaEscolhida = sel.pratica ? d.turmas.find(t => t.id === sel.pratica) : null
                        const turmaTeoricaEscolhida = sel.teorica ? d.turmas.find(t => t.id === sel.teorica) : null

                        const conflitosDaEscolha = [
                          ...(sel.pratica ? (conflitosPorTurma[sel.pratica] || []) : []),
                          ...(sel.teorica ? (conflitosPorTurma[sel.teorica] || []) : []),
                        ]
                        const temConflitoNessaDisc = conflitosDaEscolha.length > 0

                        return (
                          <div key={d.id}
                            className={`overflow-hidden rounded-xl border shadow-sm transition-colors ${
                              temConflitoNessaDisc
                                ? "border-red-300 bg-red-50"
                                : (sel.pratica || sel.teorica)
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-slate-200 bg-white"
                            }`}>

                            {/* Cabeçalho do card */}
                            <div className="flex cursor-pointer items-center gap-2.5 p-3" onClick={() => toggleDisc(d.id)}>
                              <div className="h-9 w-1 shrink-0 rounded-full" style={{ background: cor }} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">{d.nome}</p>
                                {d.pre_requisitos && (
                                  <p className="truncate text-[11px] text-slate-500">
                                    Pré-requisitos: {d.pre_requisitos}
                                  </p>
                                )}
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="text-xs text-slate-500">{d.codigo}</span>
                                  {turmaPraticaEscolhida ? (
                                    <span className="text-xs font-medium text-orange-700">
                                      ✓ Prática {turmaPraticaEscolhida.numero} — {turmaPraticaEscolhida.horario.split("/")[0]}
                                    </span>
                                  ) : !hibrida && turmaTeoricaEscolhida ? (
                                    <span className="text-xs font-medium text-orange-700">
                                      ✓ Turma {turmaTeoricaEscolhida.numero} — {turmaTeoricaEscolhida.horario.split("/")[0]}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      {(hibrida ? praticasDisc : teoricasDisc).length} turma{(hibrida ? praticasDisc : teoricasDisc).length !== 1 ? "s" : ""}
                                      {hibrida ? " (prática)" : " (teórica)"}
                                    </span>
                                  )}
                                  {hibrida && turmaPraticaEscolhida && turmaTeoricaEscolhida && (
                                    <span className="text-xs text-slate-500">
                                      + Teórica {turmaTeoricaEscolhida.numero} — {turmaTeoricaEscolhida.horario.split("/")[0]}
                                    </span>
                                  )}
                                  {teoricaFaltando && (
                                    <span className="text-xs font-medium text-amber-600">
                                      ⚠ falta escolher a teórica
                                    </span>
                                  )}
                                  {temConflitoNessaDisc && (
                                    <span className="text-xs font-medium text-red-600">
                                      ⚠ conflita com {[...new Set(conflitosDaEscolha)].join(", ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-sm text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                            </div>

                            {/* Turmas */}
                            {isOpen && (
                              <div className="flex flex-col gap-1.5 border-t border-slate-100 p-2">
                                {(hibrida ? praticasDisc : teoricasDisc).map(t => {
                                  const selecionada = hibrida ? sel.pratica === t.id : sel.teorica === t.id
                                  const conflitaSeSelecionada = selecionadasList.some(s =>
                                    s.disciplina.id !== d.id && horariosConflitam(s.turma.horario, t.horario)
                                  )
                                  return (
                                    <div key={t.id}
                                      onClick={() => hibrida ? escolherPratica(d, t.id) : escolherTeorica(d.id, t.id)}
                                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                        selecionada
                                          ? "border-orange-300 bg-orange-50"
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
                                        (t.vagas - t.vagas_reservadas - t.vagas_ocupadas) <= 3
                                          ? "border-amber-200 bg-amber-50 text-amber-700"
                                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      }`}>
                                        {t.vagas - t.vagas_reservadas - t.vagas_ocupadas} vagas
                                      </span>
                                    </div>
                                  )
                                })}

                                {/* Escolha da teórica, só aparece quando a disciplina tem mais de 1 opção */}
                                {precisaEscolherTeorica && sel.pratica && (
                                  <div className="mt-1 flex flex-col gap-1.5 border-t border-slate-100 pt-2">
                                    <p className="px-1 text-xs font-medium text-slate-500">Escolha a turma teórica:</p>
                                    {teoricasDisc.map(t => {
                                      const selecionada = sel.teorica === t.id
                                      return (
                                        <div key={t.id}
                                          onClick={() => escolherTeorica(d.id, t.id)}
                                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                                            selecionada
                                              ? "border-orange-300 bg-orange-50"
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
                                            </p>
                                            <p className="truncate text-xs text-slate-500">{t.professor}</p>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {hibrida && teoricasDisc.length === 1 && (
                                  <p className="px-1 pt-1 text-xs text-slate-400">
                                    ℹ Teórica (Turma {teoricasDisc[0].numero} — {teoricasDisc[0].horario}) incluída automaticamente com a prática
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
