export function toCSV(rows: Array<Record<string, any>>, columns?: string[]) {
  if (!rows || rows.length === 0) return ''
  const cols = columns ?? Array.from(Object.keys(rows[0]))
  const header = cols.join(',')
  const lines = rows.map(r => cols.map(c => {
    let v = r[c]
    if (v === undefined || v === null) return ''
    if (typeof v === 'string') {
      // escape quotes
      return '"' + v.replace(/"/g, '""') + '"'
    }
    return String(v)
  }).join(','))
  return [header, ...lines].join('\n')
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
