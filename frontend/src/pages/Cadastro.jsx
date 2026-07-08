import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { alunoService } from "../services/api"

export default function Cadastro() {
  const [form, setForm] = useState({ nome: "", matricula: "", email: "", cr: "", senha: "", confirmar: "" })
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function forca(s) {
    let score = 0
    if (s.length >= 8) score++
    if (/[A-Z]/.test(s)) score++
    if (/[0-9]/.test(s)) score++
    if (/[^A-Za-z0-9]/.test(s)) score++
    return score
  }

  const cores = ["", "bg-red-500", "bg-orange-500", "bg-blue-500", "bg-green-500"]
  const labels = ["", "Fraca", "Razoavel", "Boa", "Forte"]
  const f = forca(form.senha)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro("")
    if (form.senha !== form.confirmar) return setErro("Senhas nao coincidem")
    if (form.senha.length < 8) return setErro("Senha deve ter no minimo 8 caracteres")
    if (arquivo === null) return setErro("Anexe o comprovante de matricula")
    const cr = parseFloat(form.cr)
    if (isNaN(cr) || cr < 0 || cr > 10) return setErro("CR deve estar entre 0 e 10")
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("matricula", form.matricula)
      fd.append("nome", form.nome)
      fd.append("email", form.email)
      fd.append("cr", form.cr)
      fd.append("senha", form.senha)
      fd.append("comprovante", arquivo)
      const res = await alunoService.cadastrar(fd)
      localStorage.setItem("aluno", JSON.stringify(res.data))
      navigate("/disciplinas")
    } catch (err) {
      setErro(err.response?.data?.detail || "Erro ao cadastrar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-6">
      <div className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center gap-3 border-b border-white/5">
        <button onClick={() => navigate("/")} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors">
          ←
        </button>
        <span className="text-sm font-medium text-white/60">Cadastro</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-4 h-1.5 rounded-full bg-blue-500"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/15"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-white/15"></div>
        </div>
      </div>

      <div className="w-full max-w-sm z-10 mt-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          <p className="text-xs text-white/25 uppercase tracking-widest mb-1">Dados pessoais</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Nome completo</label>
            <input type="text" value={form.nome} onChange={e => set("nome", e.target.value)}
              placeholder="Como consta no historico"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors"
              required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/40">Matricula</label>
              <input type="text" value={form.matricula} onChange={e => set("matricula", e.target.value)}
                placeholder="2024001234"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors"
                required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-white/40">CR</label>
              <input type="number" value={form.cr} onChange={e => set("cr", e.target.value)}
                placeholder="8.75" min="0" max="10" step="0.01"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors"
                required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">E-mail</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
              placeholder="seu@email.com"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors"
              required />
          </div>

          <p className="text-xs text-white/25 uppercase tracking-widest mt-2 mb-1">Senha de acesso</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Criar senha</label>
            <input type="password" value={form.senha} onChange={e => set("senha", e.target.value)}
              placeholder="Minimo 8 caracteres"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors" />
            {form.senha.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= f ? cores[f] : "bg-white/10"}`}></div>
                  ))}
                </div>
                <span className="text-xs" style={{color: f===1?"#ef4444":f===2?"#f97316":f===3?"#3b82f6":"#22c55e"}}>{labels[f]}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Confirmar senha</label>
            <input type="password" value={form.confirmar} onChange={e => set("confirmar", e.target.value)}
              placeholder="Digite a senha novamente"
              className={`bg-white/5 border rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none transition-colors ${
                form.confirmar.length > 0
                  ? form.confirmar === form.senha ? "border-green-500/40" : "border-red-500/40"
                  : "border-white/10"
              }`} />
            {form.confirmar.length > 0 && (
              <span className={`text-xs ${form.confirmar === form.senha ? "text-green-400" : "text-red-400"}`}>
                {form.confirmar === form.senha ? "Senhas coincidem" : "Senhas nao coincidem"}
              </span>
            )}
          </div>

          <p className="text-xs text-white/25 uppercase tracking-widest mt-2 mb-1">Comprovante</p>

          <div
            onClick={() => document.getElementById("comprovante").click()}
            className={`border rounded-xl p-4 flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
              arquivo ? "border-green-500/40 bg-green-500/5" : "border-dashed border-white/15 hover:border-blue-500/40"
            }`}>
            <span className="text-2xl">{arquivo ? "✓" : "↑"}</span>
            <span className={`text-sm font-medium ${arquivo ? "text-green-400" : "text-white/40"}`}>
              {arquivo ? arquivo.name : "Anexar comprovante de matricula"}
            </span>
            <span className="text-xs text-white/20">PDF ou imagem — max 5MB</span>
            <input id="comprovante" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => setArquivo(e.target.files[0])} />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5 flex gap-2">
            <span className="text-blue-400 text-sm">i</span>
            <p className="text-xs text-white/35 leading-relaxed">Voce ja pode escolher disciplinas apos o cadastro. O comprovante sera validado antes do escalonamento.</p>
          </div>

          {erro && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{erro}</p>
          )}

          <button type="submit" disabled={loading}
            className="mt-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-medium text-sm rounded-lg py-3 transition-colors">
            {loading ? "Cadastrando..." : "Continuar para disciplinas"}
          </button>

          <p className="text-center text-xs text-white/25">
            Ja tem cadastro?
            <button type="button" onClick={() => navigate("/")} className="text-blue-400 hover:text-blue-300 ml-1">
              Fazer login
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
