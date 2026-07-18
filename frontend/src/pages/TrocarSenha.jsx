import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { alunoService } from "../services/api"

export default function TrocarSenha() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")
  const [senhaAtual, setSenhaAtual] = useState("")
  const [senhaNova, setSenhaNova] = useState("")
  const [confirmaSenha, setConfirmaSenha] = useState("")
  const [erro, setErro] = useState("")
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro("")

    if (senhaNova.length < 8) {
      setErro("A nova senha precisa ter pelo menos 8 caracteres.")
      return
    }
    if (senhaNova !== confirmaSenha) {
      setErro("A confirmação não bate com a nova senha.")
      return
    }

    setEnviando(true)
    try {
      await alunoService.trocarSenha(aluno.matricula, senhaAtual, senhaNova)
      setSucesso(true)
      setSenhaAtual("")
      setSenhaNova("")
      setConfirmaSenha("")
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível trocar a senha.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-sm items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/home")}
            className="shrink-0 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Voltar
          </button>
          <p className="flex-1 text-center text-sm font-semibold text-slate-800">Trocar senha</p>
          <div className="w-12 shrink-0" />
        </div>
      </header>

      <div className="mx-auto max-w-sm px-4 py-8">
        {sucesso ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-semibold text-emerald-800">Senha trocada com sucesso.</p>
            <button
              onClick={() => navigate("/home")}
              className="mt-1 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Voltar ao início
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nova senha</label>
              <input
                type="password"
                value={senhaNova}
                onChange={e => setSenhaNova(e.target.value)}
                required
                minLength={8}
                placeholder="Pelo menos 8 caracteres"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmaSenha}
                onChange={e => setConfirmaSenha(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            {erro && <p className="text-xs text-red-600">{erro}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="mt-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? "Trocando..." : "Trocar senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
