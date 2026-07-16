import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService, disciplinaService, turmaService, alunoService } from '../services/api'

function Stat({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex flex-col gap-1">
      <span className="text-xs text-white/35">{label}</span>
      <span className="text-xl font-medium text-white/90">{value}</span>
    </div>
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

  async function rodarEscalonamento() {
    if (!confirm('Rodar o escalonamento agora? Isso vai alocar ou enfileirar todas as inscrições pendentes.')) return
    setAcao('escalonar')
    setMsg('')
    try {
      const res = await adminService.escalonar()
      setMsg(`Escalonamento concluído: ${res.data.alocados} alocados, ${res.data.em_fila} em fila.`)
      await carregarTudo()
    } catch {
      setErro('Não foi possível rodar o escalonamento.')
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
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <p className="text-white/40 text-sm">Carregando painel...</p>
      </div>
    )
  }

  if (erro && !stats) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-3">
        <p className="text-red-400 text-sm">{erro}</p>
        <button onClick={() => navigate('/disciplinas')} className="text-blue-400 text-xs hover:text-blue-300">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-lg font-medium text-white/90">Painel Admin</h1>
            <p className="text-xs text-white/35 mt-0.5">Turma 267 — Medicina UFBA</p>
          </div>
          <button onClick={() => navigate('/disciplinas')} className="text-xs text-white/35 hover:text-white/60">
            Sair do admin
          </button>
        </div>

        {msg && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            {msg}
          </p>
        )}
        {erro && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}

        {/* Controle de período */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-white/85">Período de inscrição</p>
            <p className="text-xs text-white/35 mt-0.5">
              {periodoAberto ? 'Alunos podem se inscrever em turmas agora.' : 'Inscrições fechadas para alunos.'}
            </p>
          </div>
          <button
            onClick={togglePeriodo}
            disabled={acao === 'periodo'}
            className={`text-xs font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-40 ${
              periodoAberto
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
            }`}
          >
            {acao === 'periodo' ? '...' : periodoAberto ? 'Fechar período' : 'Abrir período'}
          </button>
        </div>

        {/* Gerenciamento de admins */}
        <div>
          <button
            onClick={() => setMostrarAdmins(v => !v)}
            className="flex items-center justify-between w-full text-xs text-white/40 mb-2 uppercase tracking-wide hover:text-white/60"
          >
            <span>Administradores ({admins.length})</span>
            <span>{mostrarAdmins ? '−' : '+'}</span>
          </button>

          {mostrarAdmins && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {admins.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/85">
                      {a.nome} <span className="text-white/35">({a.matricula})</span>
                      {a.matricula === alunoAtual.matricula && (
                        <span className="text-blue-400 text-xs ml-1">você</span>
                      )}
                    </span>
                    <button
                      onClick={() => rebaixar(a.id)}
                      disabled={acao === `rebaixar-${a.id}` || admins.length <= 1}
                      title={admins.length <= 1 ? 'Não é possível remover o último admin' : ''}
                      className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg px-2.5 py-1 disabled:opacity-30"
                    >
                      Remover acesso
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={promoverPorMatricula} className="border-t border-white/5 pt-3 flex flex-col gap-2">
                <p className="text-xs text-white/40">Promover novo admin (a pessoa precisa já estar cadastrada)</p>
                <div className="flex gap-2">
                  <input
                    placeholder="Matrícula"
                    value={matriculaPromover}
                    onChange={e => setMatriculaPromover(e.target.value)}
                    required
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50"
                  />
                  <button
                    type="submit"
                    disabled={acao === 'promover'}
                    className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
                  >
                    {acao === 'promover' ? '...' : 'Promover'}
                  </button>
                </div>
                {erroPromover && <p className="text-xs text-red-400">{erroPromover}</p>}
              </form>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div>
          <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">Visão geral</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Total de alunos" value={stats.total_alunos} />
            <Stat label="Comprovantes pendentes" value={stats.comprovantes_pendentes} />
            <Stat label="Comprovantes validados" value={stats.comprovantes_validados} />
            <Stat label="Comprovantes recusados" value={stats.comprovantes_recusados} />
            <Stat label="Inscrições alocadas" value={stats.inscricoes_alocadas} />
            <Stat label="Em fila" value={stats.inscricoes_em_fila} />
          </div>
        </div>

        {/* Escalonamento */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-white/85">Escalonamento por CR</p>
            <p className="text-xs text-white/35 mt-0.5">
              Recomendado: feche o período antes de rodar.
            </p>
          </div>
          <button
            onClick={rodarEscalonamento}
            disabled={acao === 'escalonar'}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {acao === 'escalonar' ? 'Rodando...' : 'Rodar escalonamento'}
          </button>
        </div>

        {/* Gerenciamento de turmas */}
        <div>
          <button
            onClick={() => setMostrarTurmas(v => !v)}
            className="flex items-center justify-between w-full text-xs text-white/40 mb-2 uppercase tracking-wide hover:text-white/60"
          >
            <span>Gerenciar disciplinas e turmas</span>
            <span>{mostrarTurmas ? '−' : '+'}</span>
          </button>

          {mostrarTurmas && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-4">

              {/* Seletor de disciplina */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-white/40">Disciplina</label>
                <select
                  value={disciplinaSelecionada ?? ''}
                  onChange={e => setDisciplinaSelecionada(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 outline-none focus:border-blue-500/50"
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
                        <p className="text-xs text-white/25 py-2">Nenhuma turma cadastrada ainda.</p>
                      )}
                      {disc.turmas.map(t => (
                        <div key={t.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 text-xs text-white/70">
                            <p className="text-sm text-white/85">
                              Turma {t.numero} ({t.tipo === 'P' ? 'Prática' : 'Teórica'})
                            </p>
                            <p className="text-white/35">{t.professor} · {t.horario}{t.sala ? ` · ${t.sala}` : ''}</p>
                            <p className="text-white/35">{t.vagas_ocupadas}/{t.vagas} vagas ocupadas</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min={t.vagas_ocupadas}
                              placeholder={String(t.vagas)}
                              value={editandoVagas[t.id] ?? ''}
                              onChange={e => setEditandoVagas(prev => ({ ...prev, [t.id]: e.target.value }))}
                              className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/85 outline-none focus:border-blue-500/50"
                            />
                            <button
                              onClick={() => salvarVagas(t.id)}
                              disabled={acao === `vagas-${t.id}` || editandoVagas[t.id] === undefined}
                              className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded-lg px-2.5 py-1.5 disabled:opacity-30"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => excluirTurma(t.id)}
                              disabled={acao === `excluir-turma-${t.id}`}
                              className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg px-2.5 py-1.5 disabled:opacity-30"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Formulário de nova turma */}
                    <form onSubmit={criarTurma} className="border-t border-white/5 pt-3 flex flex-col gap-2">
                      <p className="text-xs text-white/40">Nova turma para {disc.codigo}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Número (ex: 03)"
                          value={novaTurma.numero}
                          onChange={e => setNovaTurma(v => ({ ...v, numero: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50"
                        />
                        <select
                          value={novaTurma.tipo}
                          onChange={e => setNovaTurma(v => ({ ...v, tipo: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 outline-none focus:border-blue-500/50"
                        >
                          <option value="P">Prática (entra no escalonamento)</option>
                          <option value="T">Teórica (confirmação automática)</option>
                        </select>
                      </div>
                      <input
                        placeholder="Professor(a)"
                        value={novaTurma.professor}
                        onChange={e => setNovaTurma(v => ({ ...v, professor: e.target.value }))}
                        required
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50"
                      />
                      <input
                        placeholder="Horário (ex: Ter/Qui 08:50–10:35)"
                        value={novaTurma.horario}
                        onChange={e => setNovaTurma(v => ({ ...v, horario: e.target.value }))}
                        required
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Sala (opcional)"
                          value={novaTurma.sala}
                          onChange={e => setNovaTurma(v => ({ ...v, sala: e.target.value }))}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50"
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="Vagas"
                          value={novaTurma.vagas}
                          onChange={e => setNovaTurma(v => ({ ...v, vagas: e.target.value }))}
                          required
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 outline-none focus:border-blue-500/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={acao === 'criar-turma'}
                        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-medium rounded-lg py-2 transition-colors"
                      >
                        {acao === 'criar-turma' ? 'Criando...' : 'Adicionar turma'}
                      </button>
                    </form>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Comprovantes pendentes */}
        <div>
          <p className="text-xs text-white/40 mb-2 uppercase tracking-wide">
            Comprovantes pendentes ({pendentes.length})
          </p>
          {pendentes.length === 0 ? (
            <p className="text-xs text-white/25 py-4 text-center border border-white/5 rounded-lg">
              Nenhum comprovante pendente.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendentes.map(aluno => (
                <div key={aluno.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white/85 truncate">{aluno.nome}</p>
                    <p className="text-xs text-white/35">{aluno.matricula} · CR {aluno.cr.toFixed(2)}</p>
                    {aluno.comprovante_path && (
                      <a
                        href={`/api/uploads/${aluno.comprovante_path.split('/').pop()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Ver comprovante
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => validar(aluno.id)}
                      disabled={acao === `validar-${aluno.id}`}
                      className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg px-3 py-1.5 disabled:opacity-40"
                    >
                      Validar
                    </button>
                    <button
                      onClick={() => { setRejeitando(aluno.id); setMotivo('') }}
                      className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg px-3 py-1.5"
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
          <div className="bg-[#151821] border border-white/10 rounded-lg p-5 w-full max-w-sm flex flex-col gap-3">
            <p className="text-sm text-white/85">Motivo da rejeição (opcional)</p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: comprovante ilegível, dados divergentes..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/85 placeholder-white/20 outline-none focus:border-red-500/50 transition-colors resize-none h-20"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setRejeitando(null)}
                className="text-xs text-white/40 hover:text-white/60 px-3 py-2"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRejeicao}
                disabled={acao === `rejeitar-${rejeitando}`}
                className="text-xs bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg px-4 py-2"
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
