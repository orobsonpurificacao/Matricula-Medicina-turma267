import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService, disciplinaService, turmaService, alunoService, escalonamentoService } from '../services/api'

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
  const [alocacaoLiberada, setAlocacaoLiberada] = useState(false)
  const [escalonamentoLiberado, setEscalonamentoLiberado] = useState(false)
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
  const [novaReserva, setNovaReserva] = useState({}) // { turmaId: { referencia, posicao } }

  // Gerenciamento de admins
  const [admins, setAdmins] = useState([])
  const [mostrarAdmins, setMostrarAdmins] = useState(false)

  // Gerenciamento de prioridade (PCD e outros)
  const [prioritarios, setPrioritarios] = useState([])
  const [mostrarPrioridade, setMostrarPrioridade] = useState(false)
  const [escalonamentoCompleto, setEscalonamentoCompleto] = useState([])
  const [todosAlunos, setTodosAlunos] = useState([])
  const [filtroPrioridade, setFiltroPrioridade] = useState('')
  const [motivoPorAluno, setMotivoPorAluno] = useState({})
  const [ordemPorAluno, setOrdemPorAluno] = useState({})
  const [erroPrioridade, setErroPrioridade] = useState('')

  // Edição de dados do aluno (CR incorreto, etc)
  const [crEditado, setCrEditado] = useState({})

  // Reset de senha
  const [senhaResetada, setSenhaResetada] = useState(null) // { nome, matricula, senha_temporaria }

  // Edição de cadastro (nome, matrícula, email, CR)
  const [editandoAluno, setEditandoAluno] = useState(null) // { id, nome, matricula, email, cr }
  const [erroEditarAluno, setErroEditarAluno] = useState('')
  const [matriculaPromover, setMatriculaPromover] = useState('')
  const [erroPromover, setErroPromover] = useState('')

  async function carregarTudo() {
    setLoading(true)
    setErro('')
    try {
      const [statsRes, pendentesRes, disciplinasRes, adminsRes, prioritariosRes, escalonamentoRes, todosRes] = await Promise.all([
        adminService.estatisticas(),
        adminService.pendentes(),
        disciplinaService.listar(),
        adminService.administradores(),
        adminService.prioritarios(),
        escalonamentoService.listar(),
        adminService.todos(),
      ])
      setStats(statsRes.data)
      setPeriodoAberto(statsRes.data.periodo_aberto)
      setAlocacaoLiberada(statsRes.data.alocacao_liberada)
      setEscalonamentoLiberado(statsRes.data.escalonamento_liberado)
      setPendentes(pendentesRes.data)
      setDisciplinas(disciplinasRes.data)
      setAdmins(adminsRes.data)
      setPrioritarios(prioritariosRes.data)
      setEscalonamentoCompleto(escalonamentoRes.data)
      setTodosAlunos(todosRes.data)
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

  async function toggleAlocacao() {
    setAcao('alocacao-tela')
    setMsg('')
    try {
      if (alocacaoLiberada) {
        await adminService.bloquearAlocacao()
      } else {
        await adminService.liberarAlocacao()
      }
      await carregarTudo()
      setMsg(alocacaoLiberada ? 'Tela de alocação bloqueada pros alunos.' : 'Tela de alocação liberada pros alunos.')
    } catch {
      setErro('Não foi possível alterar a liberação da alocação.')
    } finally {
      setAcao('')
    }
  }

  async function toggleEscalonamento() {
    setAcao('escalonamento-tela')
    setMsg('')
    try {
      if (escalonamentoLiberado) {
        await adminService.bloquearEscalonamento()
      } else {
        await adminService.liberarEscalonamento()
      }
      await carregarTudo()
      setMsg(escalonamentoLiberado ? 'Escalonamento bloqueado pros alunos.' : 'Escalonamento liberado pros alunos.')
    } catch {
      setErro('Não foi possível alterar a liberação do escalonamento.')
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

  async function adicionarReserva(turmaId) {
    const dados = novaReserva[turmaId]
    if (!dados?.referencia?.trim() || !dados?.posicao) return
    setAcao(`reserva-add-${turmaId}`)
    setErro('')
    try {
      await turmaService.criarReserva(turmaId, dados.referencia.trim(), parseInt(dados.posicao, 10))
      setNovaReserva(prev => { const c = { ...prev }; delete c[turmaId]; return c })
      setMsg('Vaga reservada.')
      await recarregarDisciplinas()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível reservar a vaga.')
    } finally {
      setAcao('')
    }
  }

  async function removerReserva(turmaId, reservaId) {
    setAcao(`reserva-del-${reservaId}`)
    setErro('')
    try {
      await turmaService.excluirReserva(turmaId, reservaId)
      setMsg('Reserva removida.')
      await recarregarDisciplinas()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível remover a reserva.')
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

  async function salvarEdicaoAluno(e) {
    e.preventDefault()
    setErroEditarAluno('')
    setAcao(`editar-${editandoAluno.id}`)
    try {
      await adminService.editarAluno(editandoAluno.id, {
        nome: editandoAluno.nome,
        matricula: editandoAluno.matricula,
        email: editandoAluno.email,
        cr: parseFloat(editandoAluno.cr),
      })
      setMsg('Cadastro atualizado.')
      setEditandoAluno(null)
      await carregarTudo()
    } catch (err) {
      setErroEditarAluno(err.response?.data?.detail || 'Não foi possível salvar.')
    } finally {
      setAcao('')
    }
  }

  async function resetarSenha(alunoId) {
    if (!confirm('Gerar uma senha temporária nova pra essa pessoa? A senha atual dela deixa de funcionar imediatamente.')) return
    setAcao(`senha-${alunoId}`)
    setErroPrioridade('')
    try {
      const res = await adminService.resetarSenha(alunoId)
      setSenhaResetada(res.data)
    } catch {
      setErroPrioridade('Não foi possível resetar a senha.')
    } finally {
      setAcao('')
    }
  }

  async function salvarCR(alunoId) {
    const novoValor = crEditado[alunoId]
    if (novoValor === undefined || novoValor === '') return
    setAcao(`cr-${alunoId}`)
    setErro('')
    try {
      await adminService.editarAluno(alunoId, { cr: parseFloat(novoValor) })
      setCrEditado(c => { const n = { ...c }; delete n[alunoId]; return n })
      setMsg('CR corrigido.')
      await carregarTudo()
    } catch (err) {
      setErro(err.response?.data?.detail || 'Não foi possível corrigir o CR.')
    } finally {
      setAcao('')
    }
  }

  async function darPrioridade(alunoId, nome) {
    setErroPrioridade('')
    setAcao(`prioridade-${alunoId}`)
    try {
      const motivo = (motivoPorAluno[alunoId] || '').trim() || null
      const ordemTexto = (ordemPorAluno[alunoId] || '').trim()
      const ordem = ordemTexto ? parseInt(ordemTexto, 10) : null
      await adminService.definirPrioridade(alunoId, true, motivo, ordem)
      setMsg(`${nome} agora tem prioridade no escalonamento.`)
      await carregarTudo()
    } catch {
      setErroPrioridade('Não foi possível marcar prioridade.')
    } finally {
      setAcao('')
    }
  }

  async function atualizarOrdem(aluno) {
    setAcao(`prioridade-${aluno.id}`)
    setErroPrioridade('')
    try {
      const ordemTexto = (ordemPorAluno[aluno.id] || '').trim()
      const ordem = ordemTexto ? parseInt(ordemTexto, 10) : aluno.ordem_prioridade
      await adminService.definirPrioridade(aluno.id, true, aluno.motivo_prioridade, ordem)
      setMsg(`Posição de ${aluno.nome} atualizada.`)
      await carregarTudo()
    } catch {
      setErroPrioridade('Não foi possível atualizar a posição.')
    } finally {
      setAcao('')
    }
  }

  async function removerPrioridade(alunoId) {
    if (!confirm('Remover a prioridade dessa pessoa?')) return
    setAcao(`prioridade-${alunoId}`)
    setErro('')
    try {
      await adminService.definirPrioridade(alunoId, false, null)
      setMsg('Prioridade removida.')
      await carregarTudo()
    } catch {
      setErro('Não foi possível remover a prioridade.')
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

        {/* Liberação da tela de alocação */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Tela de alocação (por disciplina/turma)</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {alocacaoLiberada
                ? 'Alunos já podem ver quem está alocado em cada turma.'
                : 'Alunos veem "Alocação em processamento. Aguarde liberação."'}
            </p>
          </div>
          <button
            onClick={toggleAlocacao}
            disabled={acao === 'alocacao-tela'}
            className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
              alocacaoLiberada
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {acao === 'alocacao-tela' ? '...' : alocacaoLiberada ? 'Bloquear tela' : 'Liberar tela'}
          </button>
        </div>

        {/* Liberação da tela de escalonamento */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Tela de escalonamento (classificação geral)</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {escalonamentoLiberado
                ? 'Alunos já podem ver a classificação geral por CR.'
                : 'Alunos veem "Escalonamento em processamento."'}
            </p>
          </div>
          <button
            onClick={toggleEscalonamento}
            disabled={acao === 'escalonamento-tela'}
            className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
              escalonamentoLiberado
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {acao === 'escalonamento-tela' ? '...' : escalonamentoLiberado ? 'Bloquear tela' : 'Liberar tela'}
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

        {/* Gerenciamento de prioridade (PCD e outros) */}
        <div>
          <button
            onClick={() => setMostrarPrioridade(v => !v)}
            className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
          >
            <span>Prioridade no escalonamento ({prioritarios.length})</span>
            <span>{mostrarPrioridade ? '−' : '+'}</span>
          </button>

          {mostrarPrioridade && (() => {
            const escalonamentoComId = escalonamentoCompleto.map(item => {
              const aluno = todosAlunos.find(a => a.matricula === item.matricula)
              return {
                ...item,
                id: aluno?.id,
                prioridade: aluno?.prioridade || false,
                email: aluno?.email,
                validado: aluno?.validado,
                recusado: aluno?.recusado,
                validado_por: aluno?.validado_por,
                validado_em: aluno?.validado_em,
              }
            })
            const filtroLower = filtroPrioridade.trim().toLowerCase()
            const listaFiltrada = filtroLower
              ? escalonamentoComId.filter(a =>
                  a.nome.toLowerCase().includes(filtroLower) || a.matricula.includes(filtroLower)
                )
              : escalonamentoComId

            return (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs leading-5 text-slate-500">
                  Quem tem prioridade (ex: PCD) sobe pro topo do escalonamento e da alocação de
                  vagas, mesmo com CR mais baixo. O motivo fica visível só aqui, pra você — não
                  aparece pros outros alunos na lista pública.
                </p>

                {prioritarios.length > 0 && (
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-3">
                    <p className="text-xs font-medium text-slate-500">Com prioridade agora (ordem manual):</p>
                    {[...prioritarios].sort((a, b) => (a.ordem_prioridade ?? 999) - (b.ordem_prioridade ?? 999)).map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800">
                            {a.nome} <span className="text-slate-500">({a.matricula})</span>
                          </p>
                          {a.motivo_prioridade && (
                            <p className="text-xs text-slate-500">{a.motivo_prioridade}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            placeholder={String(a.ordem_prioridade ?? '')}
                            value={ordemPorAluno[a.id] ?? ''}
                            onChange={e => setOrdemPorAluno(o => ({ ...o, [a.id]: e.target.value }))}
                            className="w-14 rounded-lg border border-orange-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-orange-500"
                          />
                          <button
                            onClick={() => atualizarOrdem(a)}
                            disabled={acao === `prioridade-${a.id}`}
                            className="rounded-lg border border-orange-300 bg-white px-2 py-1 text-xs font-medium text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => removerPrioridade(a.id)}
                            disabled={acao === `prioridade-${a.id}`}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  value={filtroPrioridade}
                  onChange={e => setFiltroPrioridade(e.target.value)}
                  placeholder="Buscar por nome ou matrícula na lista de escalonamento..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />

                {erroPrioridade && <p className="text-xs text-red-600">{erroPrioridade}</p>}

                <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="text-slate-400">
                        <th className="w-12 px-3 py-2 font-medium">Pos.</th>
                        <th className="px-2 py-2 font-medium">CR</th>
                        <th className="px-2 py-2 font-medium">Matrícula</th>
                        <th className="px-2 py-2 font-medium">Nome</th>
                        <th className="px-3 py-2 font-medium">Motivo</th>
                        <th className="px-3 py-2 font-medium">Ordem</th>
                        <th className="px-3 py-2 font-medium">Senha</th>
                        <th className="px-3 py-2 text-right font-medium">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaFiltrada.map(a => (
                        <tr key={a.matricula} className={`border-t border-slate-100 ${a.prioridade ? 'bg-orange-50' : ''}`}>
                          <td className="px-3 py-2 text-slate-500">{a.posicao}</td>
                          <td className="px-2 py-2 text-slate-500">{a.cr.toFixed(4)}</td>
                          <td className="px-2 py-2 text-slate-500">{a.matricula}</td>
                          <td className="px-2 py-2 font-medium text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span>{a.nome}</span>
                              {a.id && (
                                <button
                                  onClick={() => setEditandoAluno({ id: a.id, nome: a.nome, matricula: a.matricula, email: a.email || '', cr: a.cr })}
                                  className="shrink-0 text-[10px] font-medium text-slate-400 underline hover:text-slate-600"
                                >
                                  editar
                                </button>
                              )}
                            </div>
                            {a.validado_por && (
                              <p className={`text-[10px] font-normal ${a.recusado ? 'text-red-500' : 'text-emerald-600'}`}>
                                {a.recusado ? 'Rejeitado' : 'Validado'} por {a.validado_por}
                                {a.validado_em && ` · ${new Date(a.validado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {!a.prioridade && a.id && (
                              <input
                                value={motivoPorAluno[a.id] || ''}
                                onChange={e => setMotivoPorAluno(m => ({ ...m, [a.id]: e.target.value }))}
                                placeholder="Ex: PCD"
                                className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:border-orange-400"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {!a.prioridade && a.id && (
                              <input
                                type="number"
                                min="1"
                                value={ordemPorAluno[a.id] || ''}
                                onChange={e => setOrdemPorAluno(o => ({ ...o, [a.id]: e.target.value }))}
                                placeholder="Ordem"
                                className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:border-orange-400"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {a.id && (
                              <button
                                onClick={() => resetarSenha(a.id)}
                                disabled={acao === `senha-${a.id}`}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {acao === `senha-${a.id}` ? '...' : 'Resetar'}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {!a.id ? (
                              <span className="text-slate-300">—</span>
                            ) : a.prioridade ? (
                              <button
                                onClick={() => removerPrioridade(a.id)}
                                disabled={acao === `prioridade-${a.id}`}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remover
                              </button>
                            ) : (
                              <button
                                onClick={() => darPrioridade(a.id, a.nome)}
                                disabled={acao === `prioridade-${a.id}`}
                                className="rounded-lg border border-orange-300 bg-white px-2.5 py-1 text-xs font-medium text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Dar prioridade
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
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
            <Stat label="Não alocados" value={stats.inscricoes_em_fila} />
          </div>
        </div>

        {/* Alocação */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Alocação de vagas por CR</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Já acontece sozinha a cada inscrição, cancelamento ou mudança de prioridade —
              não precisa apertar isso no dia a dia. Serve só como recálculo manual de segurança.
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

        <button
          onClick={() => navigate('/alocacao')}
          className="-mt-3 self-start text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Ver tela pública de alocação (o que os alunos veem) →
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
                        <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-xs text-slate-600">
                              <p className="text-sm font-medium text-slate-800">
                                Turma {t.numero} ({t.tipo === 'P' ? 'Prática' : 'Teórica'})
                              </p>
                              <p className="text-slate-500">{t.professor} · {t.horario}{t.sala ? ` · ${t.sala}` : ''}</p>
                              <p className="text-slate-500">{t.vagas_ocupadas + t.vagas_reservadas}/{t.vagas} vagas ocupadas</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-[10px] text-slate-400">Vagas</span>
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

                          {/* Vagas reservadas pra estudante de turma anterior */}
                          <div className="border-t border-slate-200 pt-2">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Vaga reservada (estudante de turma anterior, sem cadastro)
                            </p>
                            {t.reservas?.length > 0 && (
                              <div className="mb-2 flex flex-col gap-1">
                                {[...t.reservas].sort((a, b) => a.posicao - b.posicao).map(r => (
                                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5">
                                    <span className="text-xs text-orange-700">
                                      {r.posicao}º — {r.referencia}
                                    </span>
                                    <button
                                      onClick={() => removerReserva(t.id, r.id)}
                                      disabled={acao === `reserva-del-${r.id}`}
                                      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <input
                                placeholder="Ex: Turma 265"
                                value={novaReserva[t.id]?.referencia ?? ''}
                                onChange={e => setNovaReserva(prev => ({ ...prev, [t.id]: { ...prev[t.id], referencia: e.target.value } }))}
                                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                              />
                              <input
                                type="number"
                                min="1"
                                placeholder="Posição"
                                value={novaReserva[t.id]?.posicao ?? ''}
                                onChange={e => setNovaReserva(prev => ({ ...prev, [t.id]: { ...prev[t.id], posicao: e.target.value } }))}
                                className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                              />
                              <button
                                onClick={() => adicionarReserva(t.id)}
                                disabled={acao === `reserva-add-${t.id}`}
                                className="shrink-0 rounded-lg border border-orange-300 bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Reservar
                              </button>
                            </div>
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
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{aluno.nome}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">{aluno.matricula} · CR</span>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="10"
                        placeholder={aluno.cr.toFixed(4)}
                        value={crEditado[aluno.id] ?? ''}
                        onChange={e => setCrEditado(c => ({ ...c, [aluno.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-700 outline-none focus:border-orange-400"
                      />
                      {crEditado[aluno.id] !== undefined && crEditado[aluno.id] !== '' && (
                        <button
                          onClick={() => salvarCR(aluno.id)}
                          disabled={acao === `cr-${aluno.id}`}
                          className="rounded-lg border border-orange-300 bg-white px-2 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-40"
                        >
                          Salvar
                        </button>
                      )}
                    </div>
                    {aluno.comprovante_path && (
                      <a
                        href={`/api/uploads/${aluno.comprovante_path.split('/').pop()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Ver histórico
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

      {/* Modal de edição de cadastro */}
      {editandoAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <form
            onSubmit={salvarEdicaoAluno}
            className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <p className="text-sm font-semibold text-slate-800">Editar cadastro</p>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nome</label>
              <input
                value={editandoAluno.nome}
                onChange={e => setEditandoAluno(a => ({ ...a, nome: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Matrícula</label>
              <input
                value={editandoAluno.matricula}
                onChange={e => setEditandoAluno(a => ({ ...a, matricula: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Mudar a matrícula desconecta a sessão atual do aluno — ele precisa logar de novo.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">E-mail</label>
              <input
                type="email"
                value={editandoAluno.email}
                onChange={e => setEditandoAluno(a => ({ ...a, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">CR</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="10"
                value={editandoAluno.cr}
                onChange={e => setEditandoAluno(a => ({ ...a, cr: e.target.value }))}
                required
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            {erroEditarAluno && <p className="text-xs text-red-600">{erroEditarAluno}</p>}

            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditandoAluno(null)}
                className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={acao === `editar-${editandoAluno.id}`}
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {acao === `editar-${editandoAluno.id}` ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de senha resetada */}
      {senhaResetada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-slate-800">Senha resetada</p>
            <p className="text-xs leading-5 text-slate-500">
              Repassa essa senha temporária pra <strong>{senhaResetada.nome}</strong> ({senhaResetada.matricula})
              por fora (WhatsApp, etc.) — ela some daqui assim que você fechar essa janela, não fica salva em lugar nenhum.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <code className="flex-1 text-sm font-semibold tracking-wide text-slate-800">
                {senhaResetada.senha_temporaria}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(senhaResetada.senha_temporaria)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Copiar
              </button>
            </div>
            <button
              onClick={() => setSenhaResetada(null)}
              className="mt-1 self-end rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

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
