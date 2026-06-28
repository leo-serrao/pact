import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import * as authService from '../services/auth'
import { useFinanceStore } from '../store/useFinanceStore'
import { getPendingInvite, clearPendingInvite } from '../utils/invite'
import { acceptInvite } from '../services/sharedGroups'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  register: (email: string, password: string) => Promise<any>
  login: (email: string, password: string) => Promise<any>
  googleSignIn: () => Promise<any>
  logout: () => Promise<any>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { setProfile, setFixedExpenses, setVariableExpenses, setSavingBoxes } = useFinanceStore()
  const navigate = useNavigate()

  useEffect(() => {
    let unsubFixed: (() => void) | null = null
    let unsubVariable: (() => void) | null = null
    let unsubBoxes: (() => void) | null = null

    function clearSubscriptions() {
      if (unsubFixed) { unsubFixed(); unsubFixed = null }
      if (unsubVariable) { unsubVariable(); unsubVariable = null }
      if (unsubBoxes) { unsubBoxes(); unsubBoxes = null }
    }

    async function handlePendingInvite(isNewProfile: boolean): Promise<boolean> {
      const token = getPendingInvite()
      if (!token) return false

      if (isNewProfile) {
        // New user — go through onboarding first, it will accept the invite at the end
        return false
      }

      // Existing user — accept invite immediately and redirect to partnership
      try {
        const result = await acceptInvite(token)
        clearPendingInvite()
        navigate(`/shared/${result.partnership_id}`)
        return true
      } catch (err) {
        console.error('Failed to accept pending invite', err)
        clearPendingInvite()
        return false
      }
    }

    async function loadUserData(u: User, isNewSignIn: boolean) {
      clearSubscriptions()

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .single()

        const isNewProfile = !profile?.net_salary

        if (profile) {
          setProfile({
            uid: u.id,
            email: u.email ?? undefined,
            displayName: profile.display_name ?? u.email ?? undefined,
            netSalary: profile.net_salary ?? 0,
            payDay: profile.pay_day ?? 1,
            savingsPercent: profile.savings_percent ?? 0.2,
          } as any)
        }

        // Handle pending invite or onboarding redirect on fresh sign-in
        if (isNewSignIn && u.email) {
          const pendingToken = getPendingInvite()
          if (pendingToken) {
            if (isNewProfile) {
              // New user via OAuth with pending invite — go to onboarding
              // Onboarding will accept the invite after profile setup
              navigate('/onboarding')
            } else {
              // Existing user with pending invite — accept immediately
              await handlePendingInvite(false)
            }
          } else if (isNewProfile) {
            // New user without invite — go to onboarding
            navigate('/onboarding')
          }
        }

        const sessionId = crypto.randomUUID()

        const fixedSub = supabase
          .channel(`fixed_expenses:${u.id}:${sessionId}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'fixed_expenses',
            filter: `user_id=eq.${u.id}`
          }, () => fetchFixed(u.id))
          .subscribe()

        const variableSub = supabase
          .channel(`variable_expenses:${u.id}:${sessionId}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'variable_expenses',
            filter: `user_id=eq.${u.id}`
          }, () => fetchVariable(u.id))
          .subscribe()

        const boxesSub = supabase
          .channel(`saving_boxes:${u.id}:${sessionId}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'saving_boxes',
            filter: `user_id=eq.${u.id}`
          }, () => fetchBoxes(u.id))
          .subscribe()

        await Promise.all([
          fetchFixed(u.id),
          fetchVariable(u.id),
          fetchBoxes(u.id),
        ])

        unsubFixed = () => supabase.removeChannel(fixedSub)
        unsubVariable = () => supabase.removeChannel(variableSub)
        unsubBoxes = () => supabase.removeChannel(boxesSub)

      } catch (err) {
        console.error('Failed to load user data', err)
      }
    }

    async function fetchFixed(userId: string) {
      const { data } = await supabase
        .from('fixed_expenses').select('*')
        .eq('user_id', userId).order('created_at', { ascending: true })
      setFixedExpenses((data ?? []).map(d => ({
        id: d.id, name: d.name, amount: d.amount, category: d.category,
      })) as any)
    }

    async function fetchVariable(userId: string) {
      const { data } = await supabase
        .from('variable_expenses').select('*')
        .eq('user_id', userId).order('date', { ascending: false })
      setVariableExpenses((data ?? []).map(d => ({
        id: d.id, title: d.title, amount: d.amount,
        category: d.category, date: d.date, note: d.note ?? undefined,
      })) as any)
    }

    async function fetchBoxes(userId: string) {
      const { data } = await supabase
        .from('saving_boxes').select('*')
        .eq('user_id', userId).order('created_at', { ascending: true })
      setSavingBoxes((data ?? []).map(d => ({
        id: d.id, name: d.name, emoji: d.emoji ?? undefined,
        amount: d.amount, createdAt: d.created_at,
      })) as any)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)

      if (sess?.user) {
        // SIGNED_IN fires on OAuth callback and fresh logins
        const isNewSignIn = event === 'SIGNED_IN'
        await loadUserData(sess.user, isNewSignIn)
      } else {
        setProfile(null as any)
        setFixedExpenses([])
        setVariableExpenses([])
        setSavingBoxes([])
        clearSubscriptions()
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      clearSubscriptions()
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      register: authService.register,
      login: authService.login,
      googleSignIn: authService.googleSignIn,
      logout: authService.logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}