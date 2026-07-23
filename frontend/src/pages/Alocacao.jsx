import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { alocacaoService } from "../services/api"

const STATUS_INFO = {
  pendente: { label: "Pendente", cor: "border-slate-200 bg-slate-50 text-slate-600" },
  alocado: { label: "Alocado", cor: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  fila: { label: "Fila", cor: "border-amber-200 bg-amber-50 text-amber-700" },
  alternativa_pendente: { label: "Alternativa", cor: "border-amber-200 bg-amber-50 text-amber-700" },
}

export default function Alocacao() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [bloqueado, setBloqueado] = useState(false)
  const [erro, setErro] = useState("")
  const [semestreAtivo, setSemestreAtivo] = useState(null)

  useEffect(() => {
    alocacaoService.listar()
      .then(res => {
        setDisciplinas(res.data)
        const semestres = [...new Set(res.data.map(d => d.semestre))].sort((a, b) => a - b)
        if (semestres.length > 0) setSemestreAtivo(semestres[0])
      })
      .catch(err => {
        if (err.response?.status === 403) {
          setBloqueado(true)
        } else {
          setErro("Não foi possível carregar a alocação.")
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Carregando...</p>
      </div>
    )
  }

  if (bloqueado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl">
          ⏳
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800">Alocação em processamento</p>
          <p className="mt-2 text-sm text-slate-500">Aguarde liberação.</p>
        </div>
        <button
          onClick={() => navigate("/home")}
          className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          ← Voltar
        </button>
      </div>
    )
  }

  const semestres = [...new Set(disciplinas.map(d => d.semestre))].sort((a, b) => a - b)
  const disciplinasDoSemestre = disciplinas.filter(d => d.semestre === semestreAtivo)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/home")}
            className="shrink-0 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Voltar
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-semibold text-slate-800">Alocação — Turma 267</p>
            <p className="text-xs text-slate-500">Quem está alocado em cada turma</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem("aluno"); navigate("/") }}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">

        {erro && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        {/* Abas de semestre */}
        <div className="mb-4 flex gap-2">
          {semestres.map(sem => (
            <button
              key={sem}
              onClick={() => setSemestreAtivo(sem)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                semestreAtivo === sem
                  ? "border-orange-300 bg-orange-50 text-orange-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {sem}º semestre
            </button>
          ))}
        </div>

        {disciplinasDoSemestre.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-400 shadow-sm">
            Nenhuma inscrição nesse semestre ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {disciplinasDoSemestre.map(d => (
              <div key={d.disciplina_id}>
                <p className="mb-2 text-sm font-semibold text-slate-800">
                  {d.nome} <span className="font-normal text-slate-400">· {d.codigo}</span>
                </p>

                <div className="flex flex-col gap-3">
                  {d.turmas.map(t => (
                    <div key={t.turma_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                        <p className="text-xs font-medium text-slate-600">
                          Turma {t.numero} ({t.tipo === "P" ? "Prática" : "Teórica"}) — {t.horario}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.professor} · {t.vagas_ocupadas + t.vagas_reservadas}/{t.vagas} vagas
                        </p>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="px-4 py-2 font-medium">Aluno</th>
                            <th className="px-2 py-2 font-medium">Matrícula</th>
                            <th className="px-2 py-2 font-medium">Posição</th>
                            <th className="px-4 py-2 text-right font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.alunos.map(a => {
                            const info = a.reservada
                              ? { label: "Reservada", cor: "border-orange-200 bg-orange-50 text-orange-700" }
                              : STATUS_INFO[a.status] || STATUS_INFO.pendente
                            const souEu = !a.reservada && a.matricula === aluno.matricula
                            return (
                              <tr
                                key={`${a.reservada ? "r" : "a"}-${a.matricula}-${a.posicao_escalonamento}`}
                                className={`border-t border-slate-100 ${souEu ? "bg-orange-50" : ""} ${a.reservada ? "bg-slate-50" : ""}`}
                              >
                                <td className={`px-4 py-2 font-medium ${a.reservada ? "italic text-slate-500" : "text-slate-800"}`}>
                                  {a.nome}
                                  {souEu && <span className="ml-1.5 text-orange-600">(você)</span>}
                                </td>
                                <td className="px-2 py-2 text-slate-500">{a.matricula}</td>
                                <td className="px-2 py-2 text-slate-500">{a.posicao_escalonamento}º</td>
                                <td className="px-4 py-2 text-right">
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${info.cor}`}>
                                    {info.label}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
