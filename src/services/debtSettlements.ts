import { supabase } from './supabase'

export async function createDebtSettlement(partnershipId: string, data: {
  from_user_id: string
  to_user_id: string
  amount: number
  date: string
  note?: string
}) {
  const { data: result, error } = await supabase
    .from('debt_settlements')
    .insert({ partnership_id: partnershipId, ...data })
    .select()
    .single()

  if (error) throw error
  return result
}

export async function deleteDebtSettlement(settlementId: string) {
  const { error } = await supabase
    .from('debt_settlements')
    .delete()
    .eq('id', settlementId)

  if (error) throw error
}

export async function fetchDebtSettlements(partnershipId: string) {
  const { data, error } = await supabase
    .from('debt_settlements')
    .select('*')
    .eq('partnership_id', partnershipId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export function subscribeToDebtSettlements(
  partnershipId: string,
  onUpdate: (items: any[]) => void,
  onError?: (err: any) => void
) {
  fetchDebtSettlements(partnershipId).then(onUpdate).catch(onError)

  // Unique channel name per call to avoid conflicts between
  // Home (via userDebtSettlements) and SharedGroupDetails subscribing simultaneously
  const channel = supabase
    .channel(`debt_settlements:${partnershipId}:${crypto.randomUUID()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'debt_settlements',
      filter: `partnership_id=eq.${partnershipId}`
    }, async () => {
      try {
        const data = await fetchDebtSettlements(partnershipId)
        onUpdate(data)
      } catch (err) {
        onError?.(err)
      }
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}