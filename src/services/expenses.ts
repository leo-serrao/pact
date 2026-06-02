import { db } from './firebase'
import { collection, addDoc, collectionGroup, query, where, getDocs, setDoc } from 'firebase/firestore'
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'

export async function addFixedExpenseToUser(uid: string, data: any) {
  const col = collection(db, 'users', uid, 'fixedExpenses')
  // If caller provided an ID, use it as the document ID to keep consistency.
  if (data && data.id) {
    const d = doc(db, 'users', uid, 'fixedExpenses', data.id)
    await setDoc(d, data)
    return { id: data.id }
  }
  return addDoc(col, data)
}

export async function addVariableExpenseToUser(uid: string, data: any) {
  const col = collection(db, 'users', uid, 'variableExpenses')
  if (data && data.id) {
    const d = doc(db, 'users', uid, 'variableExpenses', data.id)
    await setDoc(d, data)
    return { id: data.id }
  }
  return addDoc(col, data)
}

export async function getFixedExpensesForUser(uid: string) {
  const col = collection(db, 'users', uid, 'fixedExpenses')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function getVariableExpensesForUser(uid: string) {
  const col = collection(db, 'users', uid, 'variableExpenses')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function deleteFixedExpenseFromUser(uid: string, expenseId: string) {
  const d = doc(db, 'users', uid, 'fixedExpenses', expenseId)
  try {
    await deleteDoc(d)
    // Also attempt to delete any doc where a field 'id' equals expenseId (fallback for older entries)
    const col = collection(db, 'users', uid, 'fixedExpenses')
    const q = query(col, where('id', '==', expenseId))
    const snap = await getDocs(q)
    const deletes = snap.docs.map(docRef => deleteDoc(doc(db, 'users', uid, 'fixedExpenses', docRef.id)))
    await Promise.all(deletes)
  } catch (err) {
    // Try fallback: find by field 'id'
    const col = collection(db, 'users', uid, 'fixedExpenses')
    const q = query(col, where('id', '==', expenseId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await Promise.all(snap.docs.map(dref => deleteDoc(doc(db, 'users', uid, 'fixedExpenses', dref.id))))
    } else {
      throw err
    }
  }
}

export async function updateFixedExpenseInUser(uid: string, expenseId: string, data: any) {
  const d = doc(db, 'users', uid, 'fixedExpenses', expenseId)
  try {
    return await updateDoc(d, data)
  } catch (err: any) {
    // If document not found, try to locate a document where field 'id' == expenseId
    const col = collection(db, 'users', uid, 'fixedExpenses')
    const q = query(col, where('id', '==', expenseId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      // update all matching docs
      await Promise.all(snap.docs.map(dref => updateDoc(doc(db, 'users', uid, 'fixedExpenses', dref.id), data)))
      return
    }
    throw err
  }
}

export async function deleteVariableExpenseFromUser(uid: string, expenseId: string) {
  const d = doc(db, 'users', uid, 'variableExpenses', expenseId)
  try {
    await deleteDoc(d)
    const col = collection(db, 'users', uid, 'variableExpenses')
    const q = query(col, where('id', '==', expenseId))
    const snap = await getDocs(q)
    const deletes = snap.docs.map(docRef => deleteDoc(doc(db, 'users', uid, 'variableExpenses', docRef.id)))
    await Promise.all(deletes)
  } catch (err) {
    const col = collection(db, 'users', uid, 'variableExpenses')
    const q = query(col, where('id', '==', expenseId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await Promise.all(snap.docs.map(dref => deleteDoc(doc(db, 'users', uid, 'variableExpenses', dref.id))))
    } else {
      throw err
    }
  }
}

export async function updateVariableExpenseInUser(uid: string, expenseId: string, data: any) {
  const d = doc(db, 'users', uid, 'variableExpenses', expenseId)
  try {
    return await updateDoc(d, data)
  } catch (err: any) {
    const col = collection(db, 'users', uid, 'variableExpenses')
    const q = query(col, where('id', '==', expenseId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await Promise.all(snap.docs.map(dref => updateDoc(doc(db, 'users', uid, 'variableExpenses', dref.id), data)))
      return
    }
    throw err
  }
}
