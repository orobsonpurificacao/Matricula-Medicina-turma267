import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService, disciplinaService, turmaService, alunoService } from '../services/api'

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function BotaoPrimario({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
    />
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const alunoAtual = JSON.parse(localStorage.getItem('aluno') || '{}')
  const [stats, setStats] = useState(null)
  const [periodoAberto, setPeriodoAberto] = useState(false)
  const [pendentes, setPendentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [acao, setAcao] = useState('') // trava botões durante requests
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [rejeitando, setRejeitando] = useState(null) // id do aluno em modal de rejeição
  const [motivo, setMotivo] = useState('')

  // Gerenciamento de turmas
  const [disciplinas, setDisciplinas] = useState([])
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState(null)
  const [mostrarTurmas, setMostrarTurmas] = useState(false)
  const [novaTurma, setNovaTurma] = useState({ numero: '', tipo: 'P', professor: '', horario: '', sala: '', vagas: '' })
  const [editandoVagas, setEditandoVagas] = useState({}) // { turmaId: valor }

  // Gerenciamento de admins
  const [admins, setAdmins] = useState([])
  const [mostrarAdmins, setMostrarAdmins] = useState(false)
  const [matriculaPromover, setMatriculaPromover] = useState('')
  const [erroPromover, setErroPromover] = useState('')

  async function carregarTudo() {
    setLoading(true)
    setErro('')
    try {
      const [statsRes, pendentesRes, disciplinasRes, adminsRes] = await Promise.all([
        adminService.estatisticas(),
        adminService.pendentes(),
        disciplinaService.listar(),
        adminService.administradores(),
      ])
      setStats(statsRes.data)
      setPeriodoAberto(statsRes.data.periodo_aberto)
      setPendentes(pendentesRes.data)
      setDisciplinas(disciplinasRes.data)
      setAdmins(adminsRes.data)
    } catch (err) {
      if (err.response?.status === 403) {
        setErro('Acesso restrito ao administrador.')
      } else {
        setErro('Erro ao carregar dados do painel.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregarTudo() }, [])

  async function togglePeriodo() {
    setAcao('periodo')
    setMsg('')
    try {
      if (periodoAberto) {
        await adminService.fecharPeriodo()
      } else {
        await adminService.abrirPeriodo()
      }
      await carregarTudo()
      setMsg(periodoAberto ? 'Período fechado.' : 'Período aberto.')
    } catch {
      setErro('Não foi possível alterar o período.')
    } finally {
      setAcao('')
    }
  }

  async function validar(alunoId) {
    setAcao(`validar-${alunoId}`)
    try {
      await adminService.validar(alunoId)
      await carregarTudo()
    } catch {
      setErro('Não foi possível validar o comprovante.')
    } finally {
      setAcao('')
    }
  }

  async function confirmarRejeicao() {
    setAcao(`rejeitar-${rejeitando}`)
    try {
      await adminService.rejeitar(rejeitando, motivo)
      setRejeitando(null)
      setMotivo('')
      await carregarTudo()
    } catch {
      setErro('Não foi possível rejeitar o comprovante.')
    } finally {
      setAcao('')
    }
  }

  async function rodarAlocacao() {
    if (!confirm('Rodar a alocação agora? Isso vai alocar ou enfileirar todas as inscrições pendentes, com base na ordem de CR já vista na lista de escalonamento.')) return
    setAcao('alocar')
    setMsg('')
    try {
      const res = await adminService.alocar()
      setMsg(`Alocação concluída: ${res.data.alocados} alocados, ${res.data.em_fila} em fila.`)
      await carregarTudo()
    } catch {
      setErro('Não foi possível rodar a alocação.')
    } finally {
      setAcao('')
    }
  }

  async function recarregarDisciplinas() {
    const r = await disciplinaService.listar()
    setDisciplinas(r.data)
  }

  async function criarTurma(e) {
    e.preventDefault()
    if (!disciplinaSelecionada) return
    setAcao('criar-turma')
    setErro('')
    try {
      await turmaService.criar({
        disciplina_id: disciplinaSelecionada,
        numero: novaTurma.numero || '01',
        tipo: novaTurma.tipo,
        professor: novaTurma.professor,
        horario: novaTurma.horario,
        sala: novaTurma.sala || null,
        vagas: parseInt(novaTurma.vagas, 10),
      })
      setNovaTurma({ numero: '', tipo: 'P', professor: '', horario: '', sala: '', vagas: '' })
      setMsg('Turma criada.')
      await recarregarDisciplinas()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível criar a turma.')
    } finally {
      setAcao('')
    }
  }

  async function salvarVagas(turmaId) {
    const novoValor = editandoVagas[turmaId]
    if (novoValor === undefined || novoValor === '') return
    setAcao(`vagas-${turmaId}`)
    setErro('')
    try {
      await turmaService.editar(turmaId, { vagas: parseInt(novoValor, 10) })
      setEditandoVagas(prev => { const c = { ...prev }; delete c[turmaId]; return c })
      setMsg('Vagas atualizadas.')
      await recarregarDisciplinas()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível atualizar as vagas.')
    } finally {
      setAcao('')
    }
  }

  async function excluirTurma(turmaId) {
    if (!confirm('Excluir esta turma? Só funciona se não houver inscrições vinculadas.')) return
    setAcao(`excluir-turma-${turmaId}`)
    setErro('')
    try {
      await turmaService.excluir(turmaId)
      setMsg('Turma excluída.')
      await recarregarDisciplinas()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível excluir a turma.')
    } finally {
      setAcao('')
    }
  }

  async function promoverPorMatricula(e) {
    e.preventDefault()
    setErroPromover('')
    setAcao('promover')
    try {
      const busca = await alunoService.buscar(matriculaPromover.trim())
      await adminService.promover(busca.data.id)
      setMatriculaPromover('')
      setMsg(`${busca.data.nome} agora é admin.`)
      await carregarTudo()
    } catch (err) {
      if (err.response?.status === 404) {
        setErroPromover('Matrícula não encontrada. A pessoa precisa se cadastrar primeiro.')
      } else {
        setErroPromover('Não foi possível promover.')
      }
    } finally {
      setAcao('')
    }
  }

  async function rebaixar(alunoId) {
    if (!confirm('Remover acesso admin desta pessoa?')) return
    setAcao(`rebaixar-${alunoId}`)
    setErro('')
    try {
      await adminService.rebaixar(alunoId)
      setMsg('Acesso admin removido.')
      await carregarTudo()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível rebaixar.')
    } finally {
      setAcao('')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Carregando painel...</p>
      </div>
    )
  }

  if (erro && !stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
        <p className="text-sm text-red-700">{erro}</p>
        <button onClick={() => navigate('/disciplinas')} className="text-xs font-medium text-orange-600 hover:text-orange-700">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Cabeçalho */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Painel Admin</p>
            <p className="text-xs text-slate-500">Turma 267 · Medicina UFBA</p>
          </div>
          <button
            onClick={() => navigate('/disciplinas')}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Sair do admin
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">

        {msg && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {msg}
          </p>
        )}
        {erro && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        {/* Controle de período */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Período de inscrição</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {periodoAberto ? 'Alunos podem se inscrever em turmas agora.' : 'Inscrições fechadas para alunos.'}
            </p>
          </div>
          <button
            onClick={togglePeriodo}
            disabled={acao === 'periodo'}
            className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
              periodoAberto
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {acao === 'periodo' ? '...' : periodoAberto ? 'Fechar período' : 'Abrir período'}
          </button>
        </div>

        {/* Gerenciamento de admins */}
        <div>
          <button
            onClick={() => setMostrarAdmins(v => !v)}
            className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            <span>Administradores ({admins.length})</span>
            <span>{mostrarAdmins ? '−' : '+'}</span>
          </button>

          {mostrarAdmins && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2">
                {admins.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-800">
                      {a.nome} <span className="text-slate-500">({a.matricula})</span>
                      {a.matricula === alunoAtual.matricula && (
                        <span className="ml-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          você
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => rebaixar(a.id)}
                      disabled={acao === `rebaixar-${a.id}` || admins.length <= 1}
                      title={admins.length <= 1 ? 'Não é possível remover o último admin' : ''}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remover acesso
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={promoverPorMatricula} className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Promover novo admin (a pessoa precisa já estar cadastrada)</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Matrícula"
                    value={matriculaPromover}
                    onChange={e => setMatriculaPromover(e.target.value)}
                    required
                  />
                  <BotaoPrimario type="submit" disabled={acao === 'promover'} className="whitespace-nowrap">
                    {acao === 'promover' ? '...' : 'Promover'}
                  </BotaoPrimario>
                </div>
                {erroPromover && <p className="text-xs text-red-600">{erroPromover}</p>}
              </form>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Visão geral</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Total de alunos" value={stats.total_alunos} />
            <Stat label="Comprovantes pendentes" value={stats.comprovantes_pendentes} />
            <Stat label="Comprovantes validados" value={stats.comprovantes_validados} />
            <Stat label="Comprovantes recusados" value={stats.comprovantes_recusados} />
            <Stat label="Inscrições alocadas" value={stats.inscricoes_alocadas} />
            <Stat label="Em fila" value={stats.inscricoes_em_fila} />
          </div>
        </div>

        {/* Alocação */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Alocação de vagas por CR</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Usa a ordem de CR (a mesma da lista de escalonamento) pra decidir quem fica com a vaga.
              Recomendado: feche o período antes de rodar.
            </p>
          </div>
          <BotaoPrimario onClick={rodarAlocacao} disabled={acao === 'alocar'} className="whitespace-nowrap">
            {acao === 'alocar' ? 'Rodando...' : 'Rodar alocação'}
          </BotaoPrimario>
        </div>

        <button
          onClick={() => navigate('/escalonamento')}
          className="-mt-3 self-start text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Ver lista pública de escalonamento (o que os alunos veem) →
        </button>

        {/* Gerenciamento de turmas */}
        <div>
          <button
            onClick={() => setMostrarTurmas(v => !v)}
            className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            <span>Gerenciar disciplinas e turmas</span>
            <span>{mostrarTurmas ? '−' : '+'}</span>
          </button>

          {mostrarTurmas && (
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

              {/* Seletor de disciplina */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600">Disciplina</label>
                <select
                  value={disciplinaSelecionada ?? ''}
                  onChange={e => setDisciplinaSelecionada(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                >
                  <option value="">Selecione uma disciplina</option>
                  {disciplinas.map(d => (
                    <option key={d.id} value={d.id}>{d.codigo} — {d.nome} ({d.semestre}º sem.)</option>
                  ))}
                </select>
              </div>

              {disciplinaSelecionada && (() => {
                const disc = disciplinas.find(d => d.id === disciplinaSelecionada)
                if (!disc) return null
                return (
                  <>
                    {/* Turmas existentes */}
                    <div className="flex flex-col gap-2">
                      {disc.turmas.length === 0 && (
                        <p className="py-2 text-xs text-slate-400">Nenhuma turma cadastrada ainda.</p>
                      )}
                      {disc.turmas.map(t => (
                        <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="min-w-0 text-xs text-slate-600">
                            <p className="text-sm font-medium text-slate-800">
                              Turma {t.numero} ({t.tipo === 'P' ? 'Prática' : 'Teórica'})
                            </p>
                            <p className="text-slate-500">{t.professor} · {t.horario}{t.sala ? ` · ${t.sala}` : ''}</p>
                            <p className="text-slate-500">{t.vagas_ocupadas}/{t.vagas} vagas ocupadas</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <input
                              type="number"
                              min={t.vagas_ocupadas}
                              placeholder={String(t.vagas)}
                              value={editandoVagas[t.id] ?? ''}
                              onChange={e => setEditandoVagas(prev => ({ ...prev, [t.id]: e.target.value }))}
                              className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                            />
                            <button
                              onClick={() => salvarVagas(t.id)}
                              disabled={acao === `vagas-${t.id}` || editandoVagas[t.id] === undefined}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => excluirTurma(t.id)}
                              disabled={acao === `excluir-turma-${t.id}`}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Formulário de nova turma */}
                    <form onSubmit={criarTurma} className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500">Nova turma para {disc.codigo}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Número (ex: 03)"
                          value={novaTurma.numero}
                          onChange={e => setNovaTurma(v => ({ ...v, numero: e.target.value }))}
                        />
                        <select
                          value={novaTurma.tipo}
                          onChange={e => setNovaTurma(v => ({ ...v, tipo: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        >
                          <option value="P">Prática (entra na alocação por CR)</option>
                          <option value="T">Teórica (confirmação automática)</option>
                        </select>
                      </div>
                      <Input
                        placeholder="Professor(a)"
                        value={novaTurma.professor}
                        onChange={e => setNovaTurma(v => ({ ...v, professor: e.target.value }))}
                        required
                      />
                      <Input
                        placeholder="Horário (ex: Ter/Qui 08:50–10:35)"
                        value={novaTurma.horario}
                        onChange={e => setNovaTurma(v => ({ ...v, horario: e.target.value }))}
                        required
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Sala (opcional)"
                          value={novaTurma.sala}
                          onChange={e => setNovaTurma(v => ({ ...v, sala: e.target.value }))}
                        />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Vagas"
                          value={novaTurma.vagas}
                          onChange={e => setNovaTurma(v => ({ ...v, vagas: e.target.value }))}
                          required
                        />
                      </div>
                      <BotaoPrimario type="submit" disabled={acao === 'criar-turma'} className="w-full">
                        {acao === 'criar-turma' ? 'Criando...' : 'Adicionar turma'}
                      </BotaoPrimario>
                    </form>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Comprovantes pendentes */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Comprovantes pendentes ({pendentes.length})
          </p>
          {pendentes.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white py-4 text-center text-xs text-slate-400 shadow-sm">
              Nenhum comprovante pendente.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendentes.map(aluno => (
                <div key={aluno.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{aluno.nome}</p>
                    <p className="text-xs text-slate-500">{aluno.matricula} · CR {aluno.cr.toFixed(3)}</p>
                    {aluno.comprovante_path && (
                      <a
                        href={`/api/uploads/${aluno.comprovante_path.split('/').pop()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Ver comprovante
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => validar(aluno.id)}
                      disabled={acao === `validar-${aluno.id}`}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Validar
                    </button>
                    <button
                      onClick={() => { setRejeitando(aluno.id); setMotivo('') }}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal simples de rejeição */}
      {rejeitando !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-slate-800">Motivo da rejeição (opcional)</p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: comprovante ilegível, dados divergentes..."
              className="h-20 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
            />
            <div className="mt-1 flex justify-end gap-2">
              <button
                onClick={() => setRejeitando(null)}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRejeicao}
                disabled={acao === `rejeitar-${rejeitando}`}
                className="rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
