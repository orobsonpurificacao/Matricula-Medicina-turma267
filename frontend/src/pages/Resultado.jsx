import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { inscricaoService, disciplinaService } from "../services/api"
import GradeHoraria from "../components/GradeHoraria"

const CORES = [
  "#F97316", "#378ADD", "#1D9E75", "#D4537E",
  "#7F77DD", "#5DCAA5", "#E24B4A", "#BA7517",
]

const STATUS_INFO = {
  pendente: { label: "Aguardando processamento", cor: "border-slate-200 bg-slate-50 text-slate-600" },
  alocado: { label: "Alocado", cor: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  fila: { label: "Não alocado", cor: "border-amber-200 bg-amber-50 text-amber-700" },
  alternativa_pendente: { label: "Alternativa em análise", cor: "border-amber-200 bg-amber-50 text-amber-700" },
}

export default function Resultado() {
  const navigate = useNavigate()
  const aluno = JSON.parse(localStorage.getItem("aluno") || "{}")

  const [inscricoes, setInscricoes] = useState([])
  const [disciplinas, setDisciplinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  // Estado do seletor de turma alternativa (quando o aluno está em fila)
  const [escolhendoAlternativa, setEscolhendoAlternativa] = useState(null) // inscricao.id
  const [enviandoAlternativa, setEnviandoAlternativa] = useState(false)

  async function carregar() {
    setLoading(true)
    setErro("")
    try {
      const [insRes, discRes] = await Promise.all([
        inscricaoService.minhas(aluno.matricula),
        disciplinaService.listar(),
      ])
      setInscricoes(insRes.data)
      setDisciplinas(discRes.data)
    } catch {
      setErro("Não foi possível carregar sua inscrição.")
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar() }, [])

  // Cruza turma_id -> disciplina, já que o backend não devolve isso direto no InscricaoOut
  const discPorTurmaId = useMemo(() => {
    const mapa = {}
    for (const d of disciplinas) {
      for (const t of d.turmas || []) {
        mapa[t.id] = d
      }
    }
    return mapa
  }, [disciplinas])

  const itensResolvidos = inscricoes.map(i => ({
    inscricao: i,
    disciplina: discPorTurmaId[i.turma_id] || null,
  }))

  const todasPendentes = inscricoes.length > 0 && inscricoes.every(i => i.status === "pendente")

  async function escolherAlternativa(inscricaoId, novaTurmaId) {
    setEnviandoAlternativa(true)
    setErro("")
    try {
      await inscricaoService.escolherAlternativa({ inscricao_id: inscricaoId, nova_turma_id: novaTurmaId })
      setEscolhendoAlternativa(null)
      await carregar()
    } catch (err) {
      setErro(err.response?.data?.detail || "Não foi possível escolher a turma alternativa.")
    } finally {
      setEnviandoAlternativa(false)
    }
  }

  const itensGrade = itensResolvidos
    .filter(x => x.disciplina)
    .map((x, idx) => ({
      turma: x.inscricao.turma,
      disciplinaNome: x.disciplina.nome,
      cor: CORES[idx % CORES.length],
      conflito: false, // já alocado/em processo — conflito deixou de ser decisão do aluno aqui
    }))

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Carregando...</p>
      </div>
    )
  }

  if (inscricoes.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-4 text-center">
        <p className="text-sm text-slate-600">Você ainda não fez nenhuma inscrição.</p>
        <button
          onClick={() => navigate("/disciplinas")}
          className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
        >
          Escolher disciplinas
        </button>
      </div>
    )
  }

  // Enquanto nada foi processado, aviso de espera + lista do que já foi enviado
  if (todasPendentes) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-2xl">
            ⏳
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">Escolha de matrícula finalizada</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Aguarde a validação do seu comprovante e a alocação de vagas
              por um representante, e volte aqui para consultar o resultado.
            </p>
          </div>
        </div>

        {/* O que já foi enviado — sem navegar pra lugar nenhum, os dados já estão no servidor */}
        <div className="mx-auto mt-8 max-w-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Disciplinas enviadas
          </p>
          <div className="flex flex-col gap-2">
            {itensResolvidos.map(({ inscricao, disciplina }, idx) => (
              <div key={inscricao.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="h-9 w-1 shrink-0 rounded-full" style={{ background: CORES[idx % CORES.length] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {disciplina?.nome || "Disciplina"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {disciplina?.codigo} · Turma {inscricao.turma.numero} — {inscricao.turma.horario}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  Aguardando
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate("/escalonamento")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Ver escalonamento completo da turma
          </button>
        </div>
      </div>
    )
  }

  // Já processado — dashboard com status de alocação e opção de editar
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-xs font-semibold text-orange-700">
            {aluno.nome?.charAt(0) || "A"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">Resultado do escalonamento</p>
            <p className="text-xs text-slate-500">{aluno.nome} · Mat. {aluno.matricula}</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem("aluno"); navigate("/") }}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">

        {erro && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        {/* Lista de disciplinas com status */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Suas disciplinas
          </p>
          <div className="flex flex-col gap-2">
            {itensResolvidos.map(({ inscricao, disciplina }, idx) => {
              const info = STATUS_INFO[inscricao.status] || STATUS_INFO.pendente
              const emFila = inscricao.status === "fila"

              // Turmas alternativas: outras turmas práticas da mesma disciplina, com vaga
              const alternativas = emFila && disciplina
                ? disciplina.turmas.filter(t =>
                    t.id !== inscricao.turma_id &&
                    t.tipo === "P" &&
                    (t.vagas - t.vagas_ocupadas) > 0
                  )
                : []

              return (
                <div key={inscricao.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-1 shrink-0 rounded-full" style={{ background: CORES[idx % CORES.length] }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {disciplina?.nome || "Disciplina"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {disciplina?.codigo} · Turma {inscricao.turma.numero} — {inscricao.turma.horario}
                      </p>
                      <p className="text-xs text-slate-500">{inscricao.turma.professor}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${info.cor}`}>
                      {info.label}
                    </span>
                  </div>

                  {emFila && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {escolhendoAlternativa === inscricao.id ? (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-xs text-slate-500">Escolha uma turma alternativa:</p>
                          {alternativas.length === 0 ? (
                            <p className="text-xs text-slate-400">Nenhuma turma alternativa com vaga no momento.</p>
                          ) : (
                            alternativas.map(t => (
                              <button
                                key={t.id}
                                onClick={() => escolherAlternativa(inscricao.id, t.id)}
                                disabled={enviandoAlternativa}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs transition hover:border-orange-300 disabled:opacity-50"
                              >
                                <span className="text-slate-700">
                                  Turma {t.numero} — {t.horario} · {t.professor}
                                </span>
                                <span className="text-slate-400">{t.vagas - t.vagas_ocupadas} vagas</span>
                              </button>
                            ))
                          )}
                          <button
                            onClick={() => setEscolhendoAlternativa(null)}
                            className="mt-1 self-start text-xs text-slate-400 hover:text-slate-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEscolhendoAlternativa(inscricao.id)}
                          className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-50"
                        >
                          Escolher turma alternativa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Grade das disciplinas processadas */}
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Grade de horários
          </p>
          <GradeHoraria itens={itensGrade} />
        </div>

        {/* Editar seleção */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">Editar turmas escolhidas</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Você pode trocar de turma a qualquer momento — inclusive disciplinas
            já <strong>alocadas</strong> — enquanto o período de inscrição estiver
            aberto. Depois que o período fecha, só quem está em fila consegue
            escolher alternativa (nessa mesma tela, mais acima).
          </p>
          <button
            onClick={() => navigate("/disciplinas")}
            className="mt-3 rounded-xl border border-orange-300 bg-white px-4 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
          >
            Ir para escolha de disciplinas
          </button>
          <button
            onClick={() => navigate("/escalonamento")}
            className="mt-3 ml-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Ver escalonamento completo
          </button>
        </div>
      </div>
    </div>
  )
}
