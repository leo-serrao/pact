import { db } from './firebase'
import { collection, addDoc, doc, setDoc, deleteDoc, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore'
import { SharedExpense } from '../types/shared'

const expensesPath = (groupId: string) => collection(db, 'sharedGroups', groupId, 'expenses')

export async function createSharedExpense(groupId: string, data: Omit<SharedExpense, 'id' | 'createdAt'>) {
  const payload = { ...data, createdAt: new Date().toISOString() }
  return addDoc(expensesPath(groupId), payload)
}

export async function updateSharedExpense(groupId: string, expenseId: string, data: Partial<SharedExpense>) {
  const d = doc(db, 'sharedGroups', groupId, 'expenses', expenseId)
  return setDoc(d, data, { merge: true })
}

export async function deleteSharedExpense(groupId: string, expenseId: string) {
  const d = doc(db, 'sharedGroups', groupId, 'expenses', expenseId)
  return deleteDoc(d)
}

export async function fetchSharedExpenses(groupId: string) {
  const q = query(expensesPath(groupId), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SharedExpense[]
}

export function subscribeToSharedExpenses(groupId: string, onUpdate: (expenses: SharedExpense[]) => void, onError?: (err: any) => void) {
  const q = query(expensesPath(groupId), orderBy('date', 'desc'))
  const unsub = onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as SharedExpense[]
    onUpdate(items)
  }, (err) => {
    if (onError) onError(err)
    else console.error('subscribeToSharedExpenses error', err)
  })
  return unsub
}

export default {}
