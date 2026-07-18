import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alunoService } from '../services/api'
import mascoteTurma267 from '../assets/mascote-turma-267.jpeg'

export default function Cadastro() {
  const [form, setForm] = useState({
    nome: '',
    matricula: '',
    email: '',
    cr: '',
    senha: '',
    confirmar: '',
  })

  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  function set(campo, valor) {
    setForm((formAtual) => ({
      ...formAtual,
      [campo]: valor,
    }))
  }

  function calcularForcaSenha(senha) {
    let score = 0

    if (senha.length >= 8) score++
    if (/[A-Z]/.test(senha)) score++
    if (/[0-9]/.test(senha)) score++
    if (/[^A-Za-z0-9]/.test(senha)) score++

    return score
  }

  const coresForca = [
    '',
    'bg-red-500',
    'bg-orange-500',
    'bg-blue-500',
    'bg-green-500',
  ]

  const labelsForca = [
    '',
    'Fraca',
    'Razoável',
    'Boa',
    'Forte',
  ]

  const forcaSenha = calcularForcaSenha(form.senha)
  const senhasCoincidem =
    form.confirmar.length > 0 && form.confirmar === form.senha

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (form.senha !== form.confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    if (form.senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (!arquivo) {
      setErro('Anexe o histórico com o seu CR.')
      return
    }

    const cr = parseFloat(form.cr)

    if (Number.isNaN(cr) || cr < 0 || cr > 10) {
      setErro('O CR deve estar entre 0 e 10.')
      return
    }

    setLoading(true)

    try {
      const fd = new FormData()

      fd.append('matricula', form.matricula)
      fd.append('nome', form.nome)
      fd.append('email', form.email)
      fd.append('cr', form.cr)
      fd.append('senha', form.senha)
      fd.append('comprovante', arquivo)

      const res = await alunoService.cadastrar(fd)

      localStorage.setItem('aluno', JSON.stringify(res.data))

      navigate('/disciplinas')
    } catch (err) {
      setErro(
        err.response?.data?.detail ||
          'Não foi possível concluir o cadastro.'
      )
    } finally {
      setLoading(false)
    }
  }

  function abrirSeletorArquivo() {
    document.getElementById('comprovante')?.click()
  }

  function handleArquivoSelecionado(e) {
    const arquivoSelecionado = e.target.files?.[0]

    if (!arquivoSelecionado) return

    const tamanhoMaximo = 5 * 1024 * 1024

    if (arquivoSelecionado.size > tamanhoMaximo) {
      setArquivo(null)
      setErro('O arquivo deve ter no máximo 5 MB.')
      return
    }

    setErro('')
    setArquivo(arquivoSelecionado)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 text-slate-800">
      {/* Cabeçalho */}
      <header className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              aria-label="Voltar para o login"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-lg text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
            >
              ←
            </button>

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

              <p className="mt-1 text-[11px] font-medium text-orange-600">
                Cadastro do aluno
              </p>
            </div>
          </div>

          <span className="flex-shrink-0 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            2026.2
          </span>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:py-14">
        {/* Área institucional */}
        <section className="flex flex-col items-center text-center lg:sticky lg:top-10 lg:items-start lg:text-left">
          <div className="relative mb-7">
            <div className="absolute inset-6 rounded-full bg-orange-300/40 blur-3xl" />

            <img
              src={mascoteTurma267}
              alt="Mascote da Turma 267 de Medicina da UFBA"
              className="relative h-56 w-56 rounded-full border-[6px] border-white object-cover shadow-2xl sm:h-64 sm:w-64 lg:h-80 lg:w-80"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Primeiro acesso
          </div>

          <h1 className="mt-5 max-w-lg text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            Organizando direitinho, todo mundo estuda.
          </h1>

          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
            Preencha seus dados acadêmicos, crie uma senha e envie
            o histórico com o seu CR para acessar as disciplinas.
          </p>

          <div className="mt-7 w-full max-w-lg rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                i
              </div>

              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Você já poderá escolher as turmas
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  O histórico será validado pela administração antes
                  da etapa final de alocação de vagas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Formulário */}
        <section>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-300/50 sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold text-orange-600">
                Cadastro
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Crie sua conta
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Informe os dados exatamente como aparecem no seu
                histórico acadêmico.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-6"
            >
              {/* Dados pessoais */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                    1
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Dados pessoais
                    </h3>

                    <p className="text-xs text-slate-500">
                      Identificação acadêmica do aluno
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="nome"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Nome completo
                    </label>

                    <input
                      id="nome"
                      type="text"
                      value={form.nome}
                      onChange={(e) => set('nome', e.target.value)}
                      placeholder="Como consta no histórico"
                      autoComplete="name"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
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
                        value={form.matricula}
                        onChange={(e) =>
                          set('matricula', e.target.value)
                        }
                        placeholder="Ex.: 2024001234"
                        autoComplete="username"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="cr"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        CR
                      </label>

                      <input
                        id="cr"
                        type="number"
                        value={form.cr}
                        onChange={(e) => set('cr', e.target.value)}
                        placeholder="Ex.: 8.758"
                        min="0"
                        max="10"
                        step="0.001"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      E-mail
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      required
                    />
                  </div>
                </div>
              </section>

              <div className="h-px bg-slate-200" />

              {/* Senha */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                    2
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Senha de acesso
                    </h3>

                    <p className="text-xs text-slate-500">
                      Proteja o acesso à sua conta
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      htmlFor="senha"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Criar senha
                    </label>

                    <input
                      id="senha"
                      type="password"
                      value={form.senha}
                      onChange={(e) => set('senha', e.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      required
                    />

                    {form.senha.length > 0 && (
                      <div className="mt-3">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                i <= forcaSenha
                                  ? coresForca[forcaSenha]
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span
                            className={`text-xs font-medium ${
                              forcaSenha === 1
                                ? 'text-red-600'
                                : forcaSenha === 2
                                ? 'text-orange-600'
                                : forcaSenha === 3
                                ? 'text-blue-600'
                                : 'text-green-600'
                            }`}
                          >
                            Senha {labelsForca[forcaSenha].toLowerCase()}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            Use maiúscula, número e símbolo
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmar"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Confirmar senha
                    </label>

                    <input
                      id="confirmar"
                      type="password"
                      value={form.confirmar}
                      onChange={(e) =>
                        set('confirmar', e.target.value)
                      }
                      placeholder="Digite a senha novamente"
                      autoComplete="new-password"
                      className={`w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                        form.confirmar.length === 0
                          ? 'border-slate-300 focus:border-orange-500 focus:ring-orange-100'
                          : senhasCoincidem
                          ? 'border-green-400 focus:border-green-500 focus:ring-green-100'
                          : 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      }`}
                      required
                    />

                    {form.confirmar.length > 0 && (
                      <div
                        className={`mt-2 flex items-center gap-2 text-xs font-medium ${
                          senhasCoincidem
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        <span>
                          {senhasCoincidem ? '✓' : '✕'}
                        </span>

                        <span>
                          {senhasCoincidem
                            ? 'As senhas coincidem'
                            : 'As senhas não coincidem'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="h-px bg-slate-200" />

              {/* Comprovante */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                    3
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Histórico
                    </h3>

                    <p className="text-xs text-slate-500">
                      Envie o histórico com o seu CR
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={abrirSeletorArquivo}
                  className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 p-7 text-center transition ${
                    arquivo
                      ? 'border-green-300 bg-green-50 hover:border-green-400'
                      : 'border-dashed border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50'
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
                      arquivo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {arquivo ? '✓' : '↑'}
                  </div>

                  <div>
                    <p
                      className={`break-all text-sm font-semibold ${
                        arquivo
                          ? 'text-green-800'
                          : 'text-slate-700'
                      }`}
                    >
                      {arquivo
                        ? arquivo.name
                        : 'Anexar histórico com CR'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      PDF, JPG ou PNG · máximo de 5 MB
                    </p>
                  </div>
                </button>

                <input
                  id="comprovante"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleArquivoSelecionado}
                />

                {/* Aviso de LGPD */}
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                      🔒
                    </div>
                    <p className="text-xs leading-5 text-emerald-800">
                      <strong>Privacidade (LGPD):</strong> seu histórico é usado só pra um
                      representante conferir seu CR. Assim que ele valida seu cadastro, o
                      arquivo é <strong>eliminado imediatamente</strong> do servidor — não fica
                      guardado depois disso.
                    </p>
                  </div>
                </div>
              </section>

              {/* Aviso */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    i
                  </div>

                  <p className="text-xs leading-5 text-blue-800">
                    Você poderá selecionar as disciplinas logo após
                    concluir o cadastro. A validação do histórico
                    ocorrerá antes da alocação de vagas.
                  </p>
                </div>
              </div>

              {/* Erro */}
              {erro && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {erro}
                </div>
              )}

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Cadastrando...'
                  : 'Continuar para disciplinas'}
              </button>

              <p className="text-center text-xs text-slate-500">
                Já tem cadastro?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="font-semibold text-orange-600 transition hover:text-orange-700"
                >
                  Fazer login
                </button>
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-4 text-center">
        <p className="text-xs text-slate-500">
          Sistema de Alocação · Medicina UFBA · Turma 267
        </p>
      </footer>
    </div>
  )
}
