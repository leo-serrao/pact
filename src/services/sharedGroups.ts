import { db } from './firebase'
import { collection, addDoc, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore'
import { usersCollection } from './firestore'

export async function getUserByEmail(email: string) {
  try {
    const q = query(usersCollection, where('email', '==', email))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const d = snap.docs[0]
    const user = { id: d.id, ...(d.data() as any) }
    return user
  } catch (err) {
    console.error('getUserByEmail error', err)
    throw err
  }
}

export async function createSharedGroup(data: { name: string; members: string[] }) {
  const col = collection(db, 'sharedGroups')
  const payload = { ...data, createdAt: new Date().toISOString() }
  return addDoc(col, payload)
}

export function subscribeToSharedGroups(uid: string, onUpdate: (groups: any[]) => void, onError?: (err: any) => void) {
  if (!uid) {
    const err = new Error('subscribeToSharedGroups called with empty uid')
    if (onError) onError(err)
    else console.error(err)
    return () => {}
  }
  const col = collection(db, 'sharedGroups')
  const q = query(col, where('members', 'array-contains', uid));
  // Try fetching once to detect permission errors clearly, then attach realtime listener
  (async () => {
    try {
      const snap = await getDocs(q)
      const groups = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      onUpdate(groups)
    } catch (err: any) {
      console.error('subscribeToSharedGroups initial getDocs error', err)
      if (onError) onError(err)
      return
    }

    const unsub = onSnapshot(q, snap => {
      const groups = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      onUpdate(groups)
    }, (err) => {
      if (onError) onError(err)
      else console.error('subscribeToSharedGroups error', err)
    })

    // store unsub on the function so caller can still call returned function
    ;(subscribeToSharedGroups as any)._lastUnsub = unsub
  })()

  return () => { const u = (subscribeToSharedGroups as any)._lastUnsub; if (u) u() }
}
