import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { escalonamentoService } from "../services/api"

const STATUS_INFO = {
  pendente: { label: "Pendente", cor: "border-slate-200 bg-slate-50 text-slate-600" },
  alocado: { label: "Alocado", cor: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  fila: { label: "Fila", cor: "border-amber-200 bg-amber-50 text-amber-700" },
  alternativa_pendente: { label: "Alternativa", cor: "border-amber-200 bg-amber-50 text-amber-700" },
}

export default function Escalonamento() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [filtro, setFiltro] = useState("")

  useEffect(() => {
    escalonamentoService.listar()
      .then(res => setDisciplinas(res.data))
      .catch(() => setErro("Não foi possível carregar o escalonamento."))
      .finally(() => setLoading(false))
  }, [])

  const filtroLower = filtro.trim().toLowerCase()
  const disciplinasFiltradas = filtroLower
    ? disciplinas.filter(d =>
        d.nome.toLowerCase().includes(filtroLower) ||
        d.codigo.toLowerCase().includes(filtroLower) ||
        d.turmas.some(t => t.alunos.some(a =>
          a.nome.toLowerCase().includes(filtroLower) || a.matricula.includes(filtroLower)
        ))
      )
    : disciplinas

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Carregando escalonamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/disciplinas")}
            className="shrink-0 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Voltar
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-semibold text-slate-800">Escalonamento — Turma 267</p>
            <p className="text-xs text-slate-500">Resultado público, ordenado por CR</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem("aluno"); navigate("/") }}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-5">

        {erro && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar por disciplina, nome ou matrícula..."
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
        />

        {disciplinasFiltradas.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-400 shadow-sm">
            {disciplinas.length === 0
              ? "Ainda não há nenhuma inscrição pra mostrar aqui — a lista aparece assim que os alunos começarem a se inscrever."
              : "Nenhum resultado para essa busca."}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {disciplinasFiltradas.map(d => (
              <div key={d.disciplina_id}>
                <p className="mb-2 text-sm font-semibold text-slate-800">
                  {d.nome} <span className="font-normal text-slate-400">· {d.codigo} · {d.semestre}º sem.</span>
                </p>

                <div className="flex flex-col gap-3">
                  {d.turmas.map(t => (
                    <div key={t.turma_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                        <p className="text-xs font-medium text-slate-600">
                          Turma {t.numero} ({t.tipo === "P" ? "Prática" : "Teórica"}) — {t.horario}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t.professor} · {t.vagas_ocupadas}/{t.vagas} vagas
                        </p>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="w-10 px-4 py-2 font-medium">#</th>
                            <th className="px-2 py-2 font-medium">Aluno</th>
                            <th className="px-2 py-2 font-medium">Matrícula</th>
                            <th className="px-2 py-2 font-medium">CR</th>
                            <th className="px-4 py-2 text-right font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.alunos.map(a => {
                            const info = STATUS_INFO[a.status] || STATUS_INFO.pendente
                            const souEu = a.matricula === aluno.matricula
                            return (
                              <tr
                                key={a.matricula}
                                className={`border-t border-slate-100 ${souEu ? "bg-orange-50" : ""}`}
                              >
                                <td className="px-4 py-2 text-slate-500">{a.posicao}</td>
                                <td className="px-2 py-2 font-medium text-slate-800">
                                  {a.nome}
                                  {souEu && <span className="ml-1.5 text-orange-600">(você)</span>}
                                </td>
                                <td className="px-2 py-2 text-slate-500">{a.matricula}</td>
                                <td className="px-2 py-2 text-slate-500">{a.cr.toFixed(3)}</td>
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
