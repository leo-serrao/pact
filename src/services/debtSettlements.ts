import { db } from './firebase'
import { collection, addDoc, getDocs, onSnapshot, doc, deleteDoc } from 'firebase/firestore'
import { DebtSettlement } from '../types/shared'

const settlementsPath = (groupId: string) => collection(db, 'sharedGroups', groupId, 'debtSettlements')

function sortByCreatedAt(items: any[]) {
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function createDebtSettlement(groupId: string, data: Omit<DebtSettlement, 'id' | 'createdAt'>) {
  const payload = { ...data, createdAt: new Date().toISOString() }
  return addDoc(settlementsPath(groupId), payload)
}

export async function deleteDebtSettlement(groupId: string, id: string) {
  const d = doc(db, 'sharedGroups', groupId, 'debtSettlements', id)
  return deleteDoc(d)
}

export async function fetchDebtSettlements(groupId: string) {
  const snap = await getDocs(settlementsPath(groupId))
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DebtSettlement[]
  return sortByCreatedAt(items)
}

export function subscribeToDebtSettlements(groupId: string, onUpdate: (items: DebtSettlement[]) => void, onError?: (err:any)=>void) {
  // Fetch once to detect permission errors, then attach realtime listener on collection
  (async () => {
    try {
      const snap = await getDocs(settlementsPath(groupId))
      const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DebtSettlement[]
      onUpdate(sortByCreatedAt(items))
    } catch (err: any) {
      console.error('subscribeToDebtSettlements initial getDocs error', err)
      if (onError) onError(err)
      return
    }

    const unsub = onSnapshot(settlementsPath(groupId), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as DebtSettlement[]
      onUpdate(sortByCreatedAt(items))
    }, (err) => { if (onError) onError(err); else console.error('subscribeToDebtSettlements error', err) })

    ;(subscribeToDebtSettlements as any)._lastUnsub = unsub
  })()

  return () => { const u = (subscribeToDebtSettlements as any)._lastUnsub; if (u) u() }
}

export default { createDebtSettlement, fetchDebtSettlements, subscribeToDebtSettlements }
