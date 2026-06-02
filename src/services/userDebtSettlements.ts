import { subscribeToSharedGroups } from './sharedGroups'
import { subscribeToDebtSettlements } from './debtSettlements'

// Subscribe to all debtSettlements for groups the user is a member of.
export function subscribeToUserDebtSettlements(uid: string, onUpdate: (items: any[]) => void, onError?: (err:any)=>void) {
  if (!uid) return () => {}

  let groupUnsub: (()=>void) | null = null
  const paymentsByGroup: Record<string, any[]> = {}
  const groupSubs: Record<string, ()=>void> = {}

  function emitAll() {
    const all = Object.values(paymentsByGroup).flat()
    onUpdate(all)
  }

  groupUnsub = subscribeToSharedGroups(uid, (groups) => {
    const groupIds = groups.map(g => g.id)
    // unsubscribe removed groups
    Object.keys(groupSubs).forEach(gid => { if (!groupIds.includes(gid)) { groupSubs[gid]?.(); delete groupSubs[gid]; delete paymentsByGroup[gid] } })
    groups.forEach(g => {
      const gid = g.id
      if (groupSubs[gid]) return
      const unsub = subscribeToDebtSettlements(gid, (items:any[]) => { paymentsByGroup[gid] = items; emitAll() }, (err) => { if (onError) onError(err) })
      groupSubs[gid] = unsub
    })
  }, (err) => { if (onError) onError?.(err) })

  return () => {
    try { groupUnsub && groupUnsub() } catch(e){}
    Object.values(groupSubs).forEach(u=>u())
  }
}

export default { subscribeToUserDebtSettlements }
