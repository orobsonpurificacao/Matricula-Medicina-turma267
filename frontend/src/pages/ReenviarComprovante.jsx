import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { alunoService } from "../services/api"

export default function ReenviarComprovante() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro("")
    if (!arquivo) {
      setErro("Anexa o histórico antes de enviar.")
      return
    }
    setEnviando(true)
    try {
      const res = await alunoService.reenviarComprovante(aluno.matricula, arquivo)
      localStorage.setItem("aluno", JSON.stringify(res.data))
      setEnviado(true)
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível enviar o histórico.")
    } finally {
      setEnviando(false)
    }
  }

  function sair() {
    localStorage.removeItem("aluno")
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-sm items-center gap-3 px-4 py-3">
          <p className="flex-1 text-center text-sm font-semibold text-slate-800">Reenviar histórico</p>
          <button
            onClick={sair}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-sm px-4 py-8">
        {enviado ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-semibold text-emerald-800">Histórico enviado.</p>
            <p className="text-xs text-emerald-700">
              Um representante vai validar de novo — volta mais tarde pra conferir.
            </p>
            <button
              onClick={sair}
              className="mt-1 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Sair
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Seu histórico foi rejeitado</p>
              {aluno.motivo_recusa && (
                <p className="mt-1 text-xs leading-5 text-red-700">{aluno.motivo_recusa}</p>
              )}
              <p className="mt-2 text-xs leading-5 text-red-700">
                Envia um novo pra continuar — sem isso você não consegue escolher disciplinas.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-orange-400">
                <span className="text-xl">↑</span>
                <span className="text-sm font-semibold text-slate-700">
                  {arquivo ? arquivo.name : "Anexar histórico com CR"}
                </span>
                <span className="text-xs text-slate-400">PDF, JPG ou PNG · máximo de 5 MB</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => setArquivo(e.target.files[0] || null)}
                />
              </label>

              {erro && <p className="text-xs text-red-600">{erro}</p>}

              <button
                type="submit"
                disabled={enviando}
                className="rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Enviar histórico"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
