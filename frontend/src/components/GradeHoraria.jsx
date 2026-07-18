import { parseHorario, paraMinutos } from '../utils/grade'

const INICIO_GRADE = 7 * 60   // 07:00
const FIM_GRADE = 22 * 60     // 22:00
const SPAN = FIM_GRADE - INICIO_GRADE
const ALTURA_PX = 640
const LARGURA_COLUNA = 110    // px por dia — largo o bastante pro nome não truncar feio

export default function GradeHoraria({ itens }) {
  // itens: [{ turma, disciplinaNome, cor, conflito }]
  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

  const horas = []
  for (let h = 7; h <= 22; h++) horas.push(h)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Minha grade</p>

      {itens.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-400">
          Selecione turmas pra ver sua grade de horários aqui.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex" style={{ minWidth: 40 + dias.length * LARGURA_COLUNA }}>
            {/* coluna de horas, fixa enquanto rola horizontalmente */}
            <div className="sticky left-0 z-10 mt-6 w-10 shrink-0 bg-white" style={{ height: ALTURA_PX }}>
              {horas.map(h => (
                <div
                  key={h}
                  className="absolute -translate-y-1/2 text-[10px] text-slate-400"
                  style={{ top: `${((h * 60 - INICIO_GRADE) / SPAN) * 100}%` }}
                >
                  {String(h).padStart(2, '0')}h
                </div>
              ))}
            </div>

            {/* colunas de dias */}
            <div className="flex flex-1 gap-1.5">
              {dias.map(dia => (
                <div key={dia} className="shrink-0" style={{ width: LARGURA_COLUNA - 6 }}>
                  <p className="mb-1 text-center text-xs font-semibold text-slate-500">{dia}</p>
                  <div className="relative overflow-hidden rounded-lg bg-slate-50" style={{ height: ALTURA_PX }}>
                    {/* linhas de hora de fundo, só pra guiar o olho */}
                    {horas.map(h => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-slate-200/70"
                        style={{ top: `${((h * 60 - INICIO_GRADE) / SPAN) * 100}%` }}
                      />
                    ))}

                    {itens.flatMap(it =>
                      parseHorario(it.turma.horario)
                        .filter(seg => seg.dias.includes(dia))
                        .map((seg, i) => {
                          const top = ((paraMinutos(seg.inicio) - INICIO_GRADE) / SPAN) * 100
                          const altura = ((paraMinutos(seg.fim) - paraMinutos(seg.inicio)) / SPAN) * 100
                          return (
                            <div
                              key={`${it.turma.id}-${dia}-${i}`}
                              title={`${it.disciplinaNome} — Turma ${it.turma.numero} (${seg.inicio}–${seg.fim})`}
                              className={`absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 ${
                                it.conflito ? 'border-red-400 bg-red-100' : 'border-white/70'
                              }`}
                              style={{
                                top: `${top}%`,
                                height: `${altura}%`,
                                background: it.conflito ? undefined : it.cor,
                              }}
                            >
                              <p className={`text-[10px] font-semibold leading-tight ${it.conflito ? 'text-red-700' : 'text-white'}`}>
                                {it.disciplinaNome}
                              </p>
                              <p className={`text-[9px] leading-tight ${it.conflito ? 'text-red-600' : 'text-white/85'}`}>
                                {seg.inicio}–{seg.fim}
                              </p>
                            </div>
                          )
                        })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
