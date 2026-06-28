import { supabase } from './supabase'

export async function createSharedExpense(partnershipId: string, data: {
  title: string
  amount: number
  paid_by: string
  date: string
  note?: string
}) {
  const { data: result, error } = await supabase
    .from('shared_expenses')
    .insert({ partnership_id: partnershipId, ...data })
    .select()
    .single()

  if (error) throw error
  return result
}

export async function updateSharedExpense(expenseId: string, data: {
  title?: string
  amount?: number
  paid_by?: string
  date?: string
  note?: string
}) {
  const { error } = await supabase
    .from('shared_expenses')
    .update(data)
    .eq('id', expenseId)

  if (error) throw error
}

export async function deleteSharedExpense(expenseId: string) {
  const { error } = await supabase
    .from('shared_expenses')
    .delete()
    .eq('id', expenseId)

  if (error) throw error
}

export async function fetchSharedExpenses(partnershipId: string) {
  const { data, error } = await supabase
    .from('shared_expenses')
    .select('*')
    .eq('partnership_id', partnershipId)
    .order('date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export function subscribeToSharedExpenses(
  partnershipId: string,
  onUpdate: (expenses: any[]) => void,
  onError?: (err: any) => void
) {
  fetchSharedExpenses(partnershipId).then(onUpdate).catch(onError)

  // Unique channel name per call to avoid conflicts between
  // Home (via sharedUserAdjustments) and SharedGroupDetails subscribing simultaneously
  const channel = supabase
    .channel(`shared_expenses:${partnershipId}:${crypto.randomUUID()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shared_expenses',
      filter: `partnership_id=eq.${partnershipId}`
    }, async () => {
      try {
        const data = await fetchSharedExpenses(partnershipId)
        onUpdate(data)
      } catch (err) {
        onError?.(err)
      }
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}