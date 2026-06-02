import { subscribeToSharedGroups } from './sharedGroups'
import { subscribeToSharedExpenses } from './sharedExpenses'
import { SharedExpense } from '../types/shared'

type Adjustment = { id: string, date: string, amount: number, groupId: string, expenseId: string, isPayer: boolean }

export function subscribeToUserSharedAdjustments(uid: string, onUpdate: (adjustments: Adjustment[]) => void, onError?: (err:any)=>void) {
  if (!uid) return () => {}

  const groupUnsubs: (()=>void)[] = []
  let expensesUnsubs: Record<string, ()=>void> = {}
  const groupAdjustments: Record<string, { id: string, date: string, amount: number }[]> = {}

  const handleGroups = (groups: any[]) => {
    // cleanup removed groups
    const groupIds = groups.map(g => g.id)
    Object.keys(expensesUnsubs).forEach(gid => { if (!groupIds.includes(gid)) { expensesUnsubs[gid]?.(); delete expensesUnsubs[gid] } })

    // subscribe to each group's expenses
    groups.forEach(g => {
      const gid = g.id
      if (expensesUnsubs[gid]) return
      const unsub = subscribeToSharedExpenses(gid, (items: SharedExpense[]) => {
        // compute adjustments for this group's expenses for current user
        const adjustments: Adjustment[] = items.map(i => {
          const participants = i.participants || []
          const split = participants.length > 0 ? i.amount / participants.length : 0
          const isPayer = i.paidBy === uid
          // For budgeting we treat adjustments as positive spending amounts for the user.
          const impact = isPayer ? (i.amount - split) : split
          return {
            id: `${gid}_${i.id}`,
            date: i.date,
            amount: Math.round((impact + Number.EPSILON) * 100) / 100,
            groupId: gid,
            expenseId: i.id,
            isPayer
          }
        })
        groupAdjustments[gid] = adjustments
        // aggregate all group adjustments
        const all: Adjustment[] = Object.values(groupAdjustments).flat()
        onUpdate(all)
      }, (err) => { if (onError) onError(err); else console.error('shared expenses listen error', err) })
      expensesUnsubs[gid] = unsub
    })
  }

  // subscribe to groups where user is member
  const unsubGroups = subscribeToSharedGroups(uid, (groups) => handleGroups(groups), (err) => { if (onError) onError?.(err) })

  return () => {
    try { unsubGroups && unsubGroups() } catch(e){}
    Object.values(expensesUnsubs).forEach(u=>u())
    groupUnsubs.forEach(u=>u())
  }
}

export default { subscribeToUserSharedAdjustments }
