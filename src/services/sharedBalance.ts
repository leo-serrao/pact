import { SharedExpense, Settlement } from '../types/shared'

export function calculateBalances(expenses: SharedExpense[]) {
  const balances: Record<string, number> = {}
  for (const e of expenses) {
    const participants = e.participants || []
    if (participants.length === 0) continue
    const split = e.amount / participants.length
    for (const p of participants) {
      if (!(p in balances)) balances[p] = 0
      if (p === e.paidBy) {
        balances[p] += e.amount - split
      } else {
        balances[p] -= split
      }
    }
  }
  // Round small fractional cents to 2 decimals
  Object.keys(balances).forEach(k => { balances[k] = Math.round((balances[k] + Number.EPSILON) * 100) / 100 })
  return balances
}

export function calculateSettlements(balances: Record<string, number>): Settlement[] {
  const settlements: Settlement[] = []
  const creditors: Array<{ uid: string; amount: number }> = []
  const debtors: Array<{ uid: string; amount: number }> = []
  for (const uid in balances) {
    const v = Math.round((balances[uid] + Number.EPSILON) * 100) / 100
    if (v > 0) creditors.push({ uid, amount: v })
    else if (v < 0) debtors.push({ uid, amount: -v })
  }

  let i = 0, j = 0
  while (i < creditors.length && j < debtors.length) {
    const cred = creditors[i]
    const debt = debtors[j]
    const amt = Math.min(cred.amount, debt.amount)
    settlements.push({ from: debt.uid, to: cred.uid, amount: Math.round((amt + Number.EPSILON) * 100) / 100 })
    cred.amount -= amt
    debt.amount -= amt
    if (cred.amount <= 0.001) i++
    if (debt.amount <= 0.001) j++
  }
  return settlements
}

// Apply recorded debt payments to settlements. Payments reduce the amount owed
// between specific users. Payments are expected to have fields { fromUserId, toUserId, amount }.
export function applyPaymentsToSettlements(settlements: Settlement[], payments: { fromUserId: string; toUserId: string; amount: number }[]) {
  const map: Record<string, number> = {}
  settlements.forEach(s => { map[`${s.from}->${s.to}`] = (map[`${s.from}->${s.to}`] || 0) + s.amount })

  for (const p of payments || []) {
    const key = `${p.fromUserId}->${p.toUserId}`
    if (map[key] !== undefined) {
      map[key] = Math.max(0, map[key] - p.amount)
    } else {
      // No direct settlement entry; ignore or could create negative/overpayment handling
      // For now, ignore payments that don't match an existing settlement direction.
    }
  }

  const result: Settlement[] = []
  Object.keys(map).forEach(k => {
    const [from, to] = k.split('->')
    const amt = Math.round((map[k] + Number.EPSILON) * 100) / 100
    if (amt > 0.001) result.push({ from, to, amount: amt })
  })
  return result
}

export default { calculateBalances, calculateSettlements }
