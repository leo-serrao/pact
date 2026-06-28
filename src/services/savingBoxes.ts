import { supabase } from './supabase'

export async function addSavingBoxToUser(uid: string, data: {
  name: string
  emoji?: string
  amount: number
}) {
  const { data: result, error } = await supabase
    .from('saving_boxes')
    .insert({ user_id: uid, ...data })
    .select()
    .single()

  if (error) throw error
  return result
}

export async function updateSavingBoxInUser(uid: string, boxId: string, data: {
  name?: string
  emoji?: string
  amount?: number
}) {
  const { error } = await supabase
    .from('saving_boxes')
    .update(data)
    .eq('id', boxId)
    .eq('user_id', uid)

  if (error) throw error
}

export async function deleteSavingBoxFromUser(uid: string, boxId: string) {
  const { error } = await supabase
    .from('saving_boxes')
    .delete()
    .eq('id', boxId)
    .eq('user_id', uid)

  if (error) throw error
}