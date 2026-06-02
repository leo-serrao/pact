export function getLocalISODate() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getLocalISODateFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatBRDate(date: string) {
  if (!date) return ''

  const dateOnly = date.split('T')[0]

  const [year, month, day] = dateOnly.split('-')

  return `${day}/${month}/${year}`
}