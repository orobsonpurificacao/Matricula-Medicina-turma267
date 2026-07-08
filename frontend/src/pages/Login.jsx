import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alunoService } from '../services/api'

export default function Login() {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await alunoService.login(matricula, senha)
      localStorage.setItem('aluno', JSON.stringify(res.data))
      navigate('/disciplinas')
    } catch (err) {
      if (err.response?.status === 404) {
        navigate('/cadastro')
      } else {
        setErro(err.response?.data?.detail || 'Matrícula ou senha incorretos')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <span className="text-xs text-white/25 uppercase tracking-widest">Sistema de Matrícula</span>
        <span className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/35">2026.2</span>
      </div>

      <div className="w-full max-w-sm z-10">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-xl font-medium text-white/90">Escolha suas disciplinas</h1>
          <p className="text-sm text-white/35 mt-1 text-center">Medicina UFBA — Turma 267</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Matrícula</label>
            <input
              type="text"
              value={matricula}
              onChange={e => setMatricula(e.target.value)}
              placeholder="Ex: 2024001234"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-white/40">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Sua senha"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          {erro && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-medium text-sm rounded-lg py-3 transition-colors"
          >
            {loading ? 'Entrando...' : 'Acessar'}
          </button>

          <p className="text-center text-xs text-white/25 mt-1">
            Primeiro acesso?{' '}
            <button type="button" onClick={() => navigate('/cadastro')} className="text-blue-400 hover:text-blue-300">
              Cadastre-se
            </button>
          </p>
        </form>
      </div>

      <p className="absolute bottom-4 text-xs text-white/15">Inscrições abertas até 19/08/2026 às 23:59</p>
    </div>
  )
}
