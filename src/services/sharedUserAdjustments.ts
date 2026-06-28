import { subscribeToPartnerships } from './sharedGroups'
import { subscribeToSharedExpenses } from './sharedExpenses'

type Adjustment = {
  id: string
  date: string
  amount: number
  partnershipId: string
  expenseId: string
  isPayer: boolean
}

export function subscribeToUserSharedAdjustments(
  uid: string,
  onUpdate: (adjustments: Adjustment[]) => void,
  onError?: (err: any) => void
) {
  if (!uid) return () => {}

  const expenseUnsubs: Record<string, () => void> = {}
  const partnershipAdjustments: Record<string, Adjustment[]> = {}

  const unsubPartnerships = subscribeToPartnerships(uid, (partnerships) => {
    const partnershipIds = partnerships.map(p => p.id)

    // Cleanup removed partnerships
    Object.keys(expenseUnsubs).forEach(pid => {
      if (!partnershipIds.includes(pid)) {
        expenseUnsubs[pid]?.()
        delete expenseUnsubs[pid]
        delete partnershipAdjustments[pid]
      }
    })

    // Subscribe to each partnership's expenses
    partnerships.forEach(p => {
      if (expenseUnsubs[p.id]) return

      expenseUnsubs[p.id] = subscribeToSharedExpenses(p.id, (expenses) => {
        partnershipAdjustments[p.id] = expenses.map(e => {
          const isPayer = e.paid_by === uid
          // Split 50/50 between the two partners
          const split = e.amount / 2
          const impact = isPayer ? e.amount - split : split

          return {
            id: `${p.id}_${e.id}`,
            date: e.date,
            amount: Math.round((impact + Number.EPSILON) * 100) / 100,
            partnershipId: p.id,
            expenseId: e.id,
            isPayer,
          }
        })

        onUpdate(Object.values(partnershipAdjustments).flat())
      }, onError)
    })
  }, onError)

  return () => {
    try { unsubPartnerships?.() } catch (e) {}
    Object.values(expenseUnsubs).forEach(u => u())
  }
}