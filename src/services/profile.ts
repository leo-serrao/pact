import { supabase } from './supabase'

export async function getUserProfile(uid: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()

  if (error) throw error
  return data
}

export async function setUserProfile(uid: string, data: {
  display_name?: string
  net_salary?: number
  pay_day?: number
  savings_percent?: number
}) {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', uid)

  if (error) throw error
}