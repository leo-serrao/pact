import { db } from './firebase'
import { collection, addDoc, setDoc, getDocs, query, where } from 'firebase/firestore'
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'

export async function addSavingBoxToUser(uid: string, data: any) {
  const col = collection(db, 'users', uid, 'savingBoxes')
  if (data && data.id) {
    const d = doc(db, 'users', uid, 'savingBoxes', data.id)
    await setDoc(d, data)
    return { id: data.id }
  }
  return addDoc(col, data)
}

export async function getSavingBoxesForUser(uid: string) {
  const col = collection(db, 'users', uid, 'savingBoxes')
  const snap = await getDocs(col)
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function updateSavingBoxInUser(uid: string, boxId: string, data: any) {
  const d = doc(db, 'users', uid, 'savingBoxes', boxId)
  try {
    return await updateDoc(d, data)
  } catch (err: any) {
    const col = collection(db, 'users', uid, 'savingBoxes')
    const q = query(col, where('id', '==', boxId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await Promise.all(snap.docs.map(dref => updateDoc(doc(db, 'users', uid, 'savingBoxes', dref.id), data)))
      return
    }
    throw err
  }
}

export async function deleteSavingBoxFromUser(uid: string, boxId: string) {
  const d = doc(db, 'users', uid, 'savingBoxes', boxId)
  try {
    await deleteDoc(d)
  } catch (err) {
    const col = collection(db, 'users', uid, 'savingBoxes')
    const q = query(col, where('id', '==', boxId))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await Promise.all(snap.docs.map(dref => deleteDoc(doc(db, 'users', uid, 'savingBoxes', dref.id))))
    } else {
      throw err
    }
  }
}
