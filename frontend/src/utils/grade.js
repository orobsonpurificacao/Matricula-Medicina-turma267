// Parseia o texto de horário já formatado pelo backend (ex: "Seg 08:50–09:45"
// ou "Ter/Qui 08:50–10:35 / Sex 13:00–14:50") em segmentos estruturados.
// Não depende de nenhuma mudança no backend — só interpreta o texto existente.

export const DIAS_ORDEM = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function parseHorario(horario) {
  if (!horario) return []
  const segmentos = horario.split(' / ')
  const resultado = []

  for (const seg of segmentos) {
    // aceita tanto en-dash (–) quanto hífen comum (-) entre os horários
    const m = seg.trim().match(/^([A-Za-zÀ-ú/]+)\s+(\d{2}:\d{2})[–-](\d{2}:\d{2})$/)
    if (!m) continue
    resultado.push({
      dias: m[1].split('/'),
      inicio: m[2],
      fim: m[3],
    })
  }
  return resultado
}

export function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Retorna true se os dois textos de horário se sobrepõem em algum dia/hora
export function horariosConflitam(horarioA, horarioB) {
  const segA = parseHorario(horarioA)
  const segB = parseHorario(horarioB)

  for (const a of segA) {
    for (const b of segB) {
      const temDiaEmComum = a.dias.some(d => b.dias.includes(d))
      if (!temDiaEmComum) continue

      const inicioA = paraMinutos(a.inicio), fimA = paraMinutos(a.fim)
      const inicioB = paraMinutos(b.inicio), fimB = paraMinutos(b.fim)

      if (inicioA < fimB && inicioB < fimA) return true
    }
  }
  return false
}
