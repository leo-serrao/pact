import { supabase } from './supabase'

// ── Fixed expenses ───────────────────────────────────────

export async function addFixedExpenseToUser(uid: string, data: {
  name: string
  amount: number
  category: string
}) {
  const { data: result, error } = await supabase
    .from('fixed_expenses')
    .insert({ user_id: uid, ...data })
    .select()
    .single()

  if (error) throw error
  return result
}

export async function updateFixedExpenseInUser(uid: string, expenseId: string, data: {
  name?: string
  amount?: number
  category?: string
}) {
  const { error } = await supabase
    .from('fixed_expenses')
    .update(data)
    .eq('id', expenseId)
    .eq('user_id', uid)

  if (error) throw error
}

export async function deleteFixedExpenseFromUser(uid: string, expenseId: string) {
  const { error } = await supabase
    .from('fixed_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', uid)

  if (error) throw error
}

// ── Variable expenses ────────────────────────────────────

export async function addVariableExpenseToUser(uid: string, data: {
  title: string
  amount: number
  category: string
  date: string
  note?: string
}) {
  const { data: result, error } = await supabase
    .from('variable_expenses')
    .insert({ user_id: uid, ...data })
    .select()
    .single()

  if (error) throw error
  return result
}

export async function updateVariableExpenseInUser(uid: string, expenseId: string, data: {
  title?: string
  amount?: number
  category?: string
  date?: string
  note?: string
}) {
  const { error } = await supabase
    .from('variable_expenses')
    .update(data)
    .eq('id', expenseId)
    .eq('user_id', uid)

  if (error) throw error
}

export async function deleteVariableExpenseFromUser(uid: string, expenseId: string) {
  const { error } = await supabase
    .from('variable_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', uid)

  if (error) throw error
}