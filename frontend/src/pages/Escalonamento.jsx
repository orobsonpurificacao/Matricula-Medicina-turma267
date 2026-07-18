import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { escalonamentoService } from "../services/api"

export default function Escalonamento() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [filtro, setFiltro] = useState("")

  useEffect(() => {
    escalonamentoService.listar()
      .then(res => setLista(res.data))
      .catch(() => setErro("Não foi possível carregar o escalonamento."))
      .finally(() => setLoading(false))
  }, [])

  const filtroLower = filtro.trim().toLowerCase()
  const listaFiltrada = filtroLower
    ? lista.filter(a =>
        a.nome.toLowerCase().includes(filtroLower) || a.matricula.includes(filtroLower)
      )
    : lista

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
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/home")}
            className="shrink-0 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Voltar
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-sm font-semibold text-slate-800">Escalonamento — Turma 267</p>
            <p className="text-xs text-slate-500">Classificação geral por CR</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem("aluno"); navigate("/") }}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">

        {erro && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar por nome ou matrícula..."
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
        />

        {listaFiltrada.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-400 shadow-sm">
            {lista.length === 0
              ? "Ainda não há nenhum aluno cadastrado."
              : "Nenhum resultado para essa busca."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="w-16 px-4 py-2.5 text-xs font-medium">Posição</th>
                  <th className="px-2 py-2.5 text-xs font-medium">CR</th>
                  <th className="px-2 py-2.5 text-xs font-medium">Matrícula</th>
                  <th className="px-4 py-2.5 text-xs font-medium">Nome</th>
                  <th className="px-4 py-2.5 text-xs font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map(a => {
                  const souEu = a.matricula === aluno.matricula
                  return (
                    <tr
                      key={a.matricula}
                      className={`border-t border-slate-100 ${souEu ? "bg-orange-50" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-slate-500">{a.posicao}</td>
                      <td className="px-2 py-2.5 text-slate-500">{a.cr.toFixed(3)}</td>
                      <td className="px-2 py-2.5 text-slate-500">{a.matricula}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {a.nome}
                        {souEu && <span className="ml-1.5 text-orange-600">(você)</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {a.motivo_prioridade && (
                          <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                            {a.motivo_prioridade}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
