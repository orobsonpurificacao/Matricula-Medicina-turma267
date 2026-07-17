import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alunoService, inscricaoService } from '../services/api'
import mascoteTurma267 from '../assets/mascote-turma-267.jpeg'

const GITHUB_URL = 'https://github.com/orobsonpurificacao'
const LINKEDIN_URL = 'https://www.linkedin.com/in/robson-purificacao'

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

      // 2º acesso (já tem alguma inscrição feita) cai na Home; quem nunca
      // escolheu nada ainda vai direto pra tela de escolha de disciplinas.
      try {
        const inscricoes = await inscricaoService.minhas(res.data.matricula)
        navigate(inscricoes.data.length > 0 ? '/home' : '/disciplinas')
      } catch {
        navigate('/disciplinas')
      }
    } catch (err) {
      if (err.response?.status === 404) {
        navigate('/cadastro')
        return
      }

      setErro(
        err.response?.data?.detail ||
          'Matrícula ou senha incorretos'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 text-slate-800">
      {/* Cabeçalho */}
      <header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border border-orange-200 bg-orange-50 shadow-sm">
              <img
                src={mascoteTurma267}
                alt="Mascote da Turma 267"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                Sistema de Alocação
              </p>

              <p className="text-xs text-slate-500">
                Medicina UFBA · Turma 267
              </p>

              <div className="mt-2 text-[11px] leading-4 text-slate-400">
                <p>
                  Desenvolvido por{' '}
                  <span className="font-semibold text-slate-600">
                    Robson Purificação
                  </span>
                </p>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <a
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir LinkedIn de Robson Purificação"
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-medium text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
                  >
                    <span aria-hidden="true">💼</span>
                    LinkedIn
                  </a>

                  <a
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir GitHub de Robson Purificação"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-100"
                  >
                    <span aria-hidden="true">💻</span>
                    GitHub
                  </a>
                </div>

                <p className="mt-2">
                  Administrado por{' '}
                  <span className="font-semibold text-slate-600">
                    Henrique, Eric, Endhi, Luis e Wenderson
                  </span>
                </p>
              </div>
            </div>
          </div>

          <span className="flex-shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            2026.2
          </span>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="mx-auto grid min-h-[calc(100vh-150px)] max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14 lg:py-14">
        {/* Apresentação */}
        <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            2026.2
          </div>

          {/* Mascote exibido no celular */}
          <div className="relative mb-8 flex justify-center lg:hidden">
            <div className="absolute inset-4 rounded-full bg-orange-300/40 blur-3xl" />

            <img
              src={mascoteTurma267}
              alt="Mascote da Turma 267 de Medicina da UFBA"
              className="relative h-64 w-64 rounded-full border-4 border-white object-cover shadow-2xl"
            />
          </div>

          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            A medicina já é difícil.
            <br />
            <span className="text-orange-600">
              A matrícula não precisa ser.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Consulte as turmas disponíveis, monte sua grade e organize
            seu semestre 2026.2 na Turma 267.
          </p>

          <div className="mt-8 grid w-full max-w-xl gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                1
              </div>

              <p className="text-sm font-semibold text-slate-800">
                Acesse
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Entre com sua matrícula e senha.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                2
              </div>

              <p className="text-sm font-semibold text-slate-800">
                Escolha
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Selecione as turmas desejadas.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                3
              </div>

              <p className="text-sm font-semibold text-slate-800">
                Confirme
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Revise e finalize sua inscrição.
              </p>
            </div>
          </div>
        </section>

        {/* Mascote e formulário */}
        <section className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
          {/* Mascote aumentado em aproximadamente 40% */}
          <div className="relative hidden items-center justify-center lg:flex">
            <div className="absolute h-80 w-80 rounded-full bg-orange-300/40 blur-3xl" />

            <img
              src={mascoteTurma267}
              alt="Mascote da Turma 267 de Medicina da UFBA"
              className="relative w-full max-w-[480px] rounded-full border-[6px] border-white object-cover shadow-2xl"
            />
          </div>

          {/* Formulário */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/50 sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-semibold text-orange-600">
                Área do aluno
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Entre na sua conta
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Utilize os dados cadastrados para acessar o sistema.
              </p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="matricula"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Matrícula
                </label>

                <input
                  id="matricula"
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ex.: 2024001234"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="senha"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Senha
                </label>

                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  required
                />
              </div>

              {erro && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Acessar sistema'}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs text-slate-400">
                  primeiro acesso
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={() => navigate('/cadastro')}
                className="w-full rounded-xl border border-orange-300 bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition hover:border-orange-400 hover:bg-orange-50 focus:outline-none focus:ring-4 focus:ring-orange-100"
              >
                Criar cadastro
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-slate-200 bg-white px-5 py-4 text-center">
        <p className="text-xs text-slate-500">
          Inscrições abertas até{' '}
          <strong className="font-semibold text-slate-700">
            19/08/2026 às 23:59
          </strong>
        </p>
      </footer>
    </div>
  )
}
