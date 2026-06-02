import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { auth } from '../services/firebase'
import * as authService from '../services/auth'
import { getUserProfile, setUserProfile } from '../services/firestore'
import { useFinanceStore } from '../store/useFinanceStore'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

type AuthContextValue = {
  user: FirebaseUser | null
  loading: boolean
  register: (email: string, password: string) => Promise<any>
  login: (email: string, password: string) => Promise<any>
  googleSignIn?: () => Promise<any>
  logout: () => Promise<any>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { setProfile, setFixedExpenses, setVariableExpenses } = useFinanceStore()

  useEffect(() => {
    let unsubFixed: (() => void) | null = null
    let unsubVariable: (() => void) | null = null
    let unsubBoxes: (() => void) | null = null

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        // Ensure Firestore /users/{uid} exists and has email + createdAt (merge: true)
        try {
          const profile = await getUserProfile(u.uid) || {}
          const createdAt = (profile as any).createdAt ?? new Date().toISOString()
          const update: any = { createdAt }
          if (u.email) update.email = u.email
          // only set displayName from auth if not present in profile (don't overwrite user-chosen name)
          if (!(profile as any).displayName && u.displayName) update.displayName = u.displayName
          await setUserProfile(u.uid, update)

          // Merge profile for local state without overwriting user-specific settings
          const merged = {
            uid: u.uid,
            email: u.email ?? (profile as any).email ?? undefined,
            displayName: (profile as any).displayName ?? u.displayName ?? (u.email ?? (profile as any).email ?? undefined),
            ...(profile as any),
            createdAt
          }
          setProfile(merged as any)
        } catch (err) {
          console.error('Failed to sync user profile to Firestore', err)
        }

        // real-time listeners for expenses
        const fixedCol = collection(db, 'users', u.uid, 'fixedExpenses')
        const variableCol = collection(db, 'users', u.uid, 'variableExpenses')
        const boxesCol = collection(db, 'users', u.uid, 'savingBoxes')

        unsubFixed = onSnapshot(fixedCol, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          setFixedExpenses(items as any)
        })

        unsubVariable = onSnapshot(variableCol, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          setVariableExpenses(items as any)
        })

        unsubBoxes = onSnapshot(boxesCol, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          // set into store
          ;(useFinanceStore.getState().setSavingBoxes as any)(items)
        }, (err) => {
          // handle permission or other listener errors gracefully
          console.error('SavingBoxes listener error', err)
          // clear boxes to avoid stale data when permissions change
          ;(useFinanceStore.getState().setSavingBoxes as any)([])
        })
      } else {
        setProfile(null as any)
        if (unsubFixed) unsubFixed()
        if (unsubVariable) unsubVariable()
        if (unsubBoxes) unsubBoxes()
      }
      setLoading(false)
    })

    return () => {
      unsub()
      if (unsubFixed) unsubFixed()
      if (unsubVariable) unsubVariable()
      if (unsubBoxes) unsubBoxes()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, register: authService.register, login: authService.login, googleSignIn: authService.signInWithGoogle, logout: authService.logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
