import { db } from './firebase'
import { collection, doc, getDoc, setDoc, addDoc, query, where, getDocs } from 'firebase/firestore'

export const usersCollection = collection(db, 'users')

export async function getUserProfile(uid: string) {
  const d = doc(usersCollection, uid)
  const snap = await getDoc(d)
  return snap.exists() ? snap.data() : null
}

export async function setUserProfile(uid: string, data: any) {
  const d = doc(usersCollection, uid)
  return setDoc(d, data, { merge: true })
}
