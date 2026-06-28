import { subscribeToPartnerships } from './sharedGroups'
import { subscribeToDebtSettlements } from './debtSettlements'

export function subscribeToUserDebtSettlements(
  uid: string,
  onUpdate: (items: any[]) => void,
  onError?: (err: any) => void
) {
  if (!uid) return () => {}

  const settlementUnsubs: Record<string, () => void> = {}
  const settlementsByPartnership: Record<string, any[]> = {}

  function emitAll() {
    onUpdate(Object.values(settlementsByPartnership).flat())
  }

  const unsubPartnerships = subscribeToPartnerships(uid, (partnerships) => {
    const partnershipIds = partnerships.map(p => p.id)

    // Cleanup removed partnerships
    Object.keys(settlementUnsubs).forEach(pid => {
      if (!partnershipIds.includes(pid)) {
        settlementUnsubs[pid]?.()
        delete settlementUnsubs[pid]
        delete settlementsByPartnership[pid]
      }
    })

    partnerships.forEach(p => {
      if (settlementUnsubs[p.id]) return

      settlementUnsubs[p.id] = subscribeToDebtSettlements(p.id, (items) => {
        settlementsByPartnership[p.id] = items
        emitAll()
      }, onError)
    })
  }, onError)

  return () => {
    try { unsubPartnerships?.() } catch (e) {}
    Object.values(settlementUnsubs).forEach(u => u())
  }
}