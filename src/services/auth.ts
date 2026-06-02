import { auth } from './firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

export async function register(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export async function logout() {
  return signOut(auth)
}
