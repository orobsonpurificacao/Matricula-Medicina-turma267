import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { disciplinaService } from "../services/api"

const CORES = [
  "#378ADD", "#1D9E75", "#BA7517", "#D4537E",
  "#7F77DD", "#5DCAA5", "#E24B4A", "#F97316"
]

function traduzHorario(sigaa) {
  return sigaa
}

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [abertas, setAbertas] = useState({})
  const [escolhas, setEscolhas] = useState({})
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")

  useEffect(() => {
    disciplinaService.listar().then(res => {
      setDisciplinas(res.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function toggleDisc(id) {
    setAbertas(a => ({ ...a, [id]: !a[id] }))
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
    setAbertas(a => ({ ...a, [discId]: true }))
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

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-white/30 text-sm">Carregando disciplinas...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-white/5 sticky top-0 bg-[#0f1117] z-10">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-medium text-blue-400">
          {aluno.nome?.charAt(0) || "A"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/75 truncate">{aluno.nome}</p>
          <p className="text-xs text-white/30">CR {aluno.cr} · Mat. {aluno.matricula}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1 text-xs text-green-400">
          CR {aluno.cr}
        </div>
      </div>

      {/* Deadline */}
      <div className="px-4 py-2 bg-amber-500/8 border-b border-amber-500/15 flex items-center gap-2">
        <span className="text-amber-400 text-xs">⏰</span>
        <span className="text-xs text-amber-400/80">Inscrições encerram em <strong>19/08/2026 às 23:59</strong></span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-white/25 uppercase tracking-widest">Disciplinas disponíveis</span>
          <span className="text-xs text-white/30">
            <span className="text-blue-400 font-medium">{total}</span> selecionadas
          </span>
        </div>

        {Object.entries(porSemestre).sort(([a],[b]) => a-b).map(([sem, discs]) => (
          <div key={sem} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-white/6"></div>
              <span className="text-xs text-white/20 uppercase tracking-widest">{sem}º Semestre</span>
              <div className="h-px flex-1 bg-white/6"></div>
            </div>

            <div className="flex flex-col gap-1.5">
              {discs.map((d, idx) => {
                const cor = CORES[idx % CORES.length]
                const isOpen = abertas[d.id]
                const escolhida = escolhas[d.id]
                const turmasEscalonadas = apenasTeoricas(d) ? teoricasDaDisc(d) : praticasDaDisc(d)
                const turmaEscolhida = d.turmas?.find(t => t.id === escolhida)

                return (
                  <div key={d.id}
                    className={`rounded-xl overflow-hidden border transition-colors ${
                      escolhida ? "border-blue-500/40 bg-blue-500/5" : "border-white/8 bg-white/3"
                    }`}>

                    {/* Card header */}
                    <div className="flex items-center gap-2.5 p-3 cursor-pointer"
                      onClick={() => toggleDisc(d.id)}>
                      <div className="w-0.5 h-9 rounded-full flex-shrink-0" style={{background: cor}}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">{d.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-white/30">{d.codigo}</span>
                          {turmaEscolhida ? (
                            <span className="text-xs text-blue-400">✓ Turma {turmaEscolhida.numero} — {turmaEscolhida.horario.split("/")[0]}</span>
                          ) : (
                            <span className="text-xs text-white/25">
                              {turmasEscalonadas.length} turma{turmasEscalonadas.length !== 1 ? "s" : ""}
                              {apenasTeoricas(d) ? " (teórica)" : " (prática)"}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-white/20 text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                    </div>

                    {/* Turmas */}
                    {isOpen && (
                      <div className="border-t border-white/6 p-2 flex flex-col gap-1.5">
                        {turmasEscalonadas.map(t => (
                          <div key={t.id}
                            onClick={() => escolher(d.id, t.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                              escolhida === t.id
                                ? "border-blue-500/50 bg-blue-500/10"
                                : "border-white/6 bg-white/2 hover:border-blue-500/25"
                            }`}>
                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              escolhida === t.id ? "border-blue-400 bg-blue-400" : "border-white/20"
                            }`}>
                              {escolhida === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white/75">Turma {t.numero} — {t.horario}</p>
                              <p className="text-xs text-white/30 truncate">{t.professor}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                              t.vagas - t.vagas_ocupadas <= 3
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                            }`}>
                              {t.vagas - t.vagas_ocupadas} vagas
                            </span>
                          </div>
                        ))}
                        {!apenasTeoricas(d) && teoricasDaDisc(d).length > 0 && (
                          <p className="text-xs text-white/20 px-1 pt-1">
                            ℹ Teórica alocada automaticamente com a prática
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/6 bg-[#0f1117]">
        <button
          onClick={handleConfirmar}
          disabled={total === 0}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
          Confirmar inscrição ({total} disciplina{total !== 1 ? "s" : ""})
        </button>
      </div>
    </div>
  )
}
