import { SharedExpense, Settlement } from '../types/shared'

export function calculateBalances(expenses: SharedExpense[]) {
  const balances: Record<string, number> = {}

  for (const e of expenses) {
    const participants = (e as any).participants || []
    if (participants.length === 0) continue

    const splitType = (e as any).split_type ?? 'equal'

    for (const p of participants) {
      if (!(p in balances)) balances[p] = 0

      if (splitType === 'full') {
        if (p === (e as any).paidBy) {
          balances[p] += e.amount
        } else {
          balances[p] -= e.amount
        }
      } else {
        const split = e.amount / participants.length
        if (p === (e as any).paidBy) {
          balances[p] += e.amount - split
        } else {
          balances[p] -= split
        }
      }
    }
  }

  Object.keys(balances).forEach(k => {
    balances[k] = Math.round((balances[k] + Number.EPSILON) * 100) / 100
  })

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
    settlements.push({
      from: debt.uid,
      to: cred.uid,
      amount: Math.round((amt + Number.EPSILON) * 100) / 100,
    })
    cred.amount -= amt
    debt.amount -= amt
    if (cred.amount <= 0.001) i++
    if (debt.amount <= 0.001) j++
  }

  return settlements
}

// Applies recorded payments to settlements and returns the net settlements.
// Payments fully reduce the owed amount. Only settlements with amount > 0
// are returned (zero = fully settled).
//
// A payment can predate a swing in who-owes-whom (e.g. a new full-charge
// expense flips the direction). When that happens the payment shows up
// opposite the current settlement ("reverseKey"). Such a payment already
// retired part of the payer's old debt, so it must be ADDED to the new
// settlement (the old debt no longer offsets it) — never subtracted, or
// the old payment would incorrectly cancel out the other person's new debt.
export function applyPaymentsToSettlements(
  settlements: Settlement[],
  payments: { fromUserId: string; toUserId: string; amount: number }[]
): Settlement[] {
  // Build a net balance map: positive means "from owes to"
  const net: Record<string, number> = {}

  for (const s of settlements) {
    const key = `${s.from}->${s.to}`
    net[key] = (net[key] || 0) + s.amount
  }

  for (const p of payments) {
    const key = `${p.fromUserId}->${p.toUserId}`
    const reverseKey = `${p.toUserId}->${p.fromUserId}`

    if (net[key] !== undefined) {
      net[key] = Math.round((net[key] - p.amount + Number.EPSILON) * 100) / 100
      if (net[key] < 0) {
        net[reverseKey] = Math.round(((net[reverseKey] || 0) + Math.abs(net[key])) * 100) / 100
        net[key] = 0
      }
    } else if (net[reverseKey] !== undefined) {
      net[reverseKey] = Math.round((net[reverseKey] + p.amount + Number.EPSILON) * 100) / 100
    } else {
      // No settlement in either direction yet: record the payment as a
      // standing credit, in case a settlement later appears in reverse.
      net[reverseKey] = Math.round((p.amount + Number.EPSILON) * 100) / 100
    }
  }

  // Return only settlements with remaining balance > 0
  const result: Settlement[] = []
  for (const key of Object.keys(net)) {
    const amt = net[key]
    if (amt > 0.001) {
      const [from, to] = key.split('->')
      result.push({ from, to, amount: amt })
    }
  }

  return result
}

export default { calculateBalances, calculateSettlements, applyPaymentsToSettlements }