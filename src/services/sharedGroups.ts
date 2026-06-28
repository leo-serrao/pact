import { supabase } from './supabase'

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', email)
    .single()
  if (error) throw error
  return data
}

export async function createPartnership(createdBy: string) {
  const token = crypto.randomUUID()

  const { data: partnership, error: partnershipError } = await supabase
    .from('partnerships')
    .insert({ created_by: createdBy, invite_token: token })
    .select()
    .single()

  if (partnershipError) throw partnershipError

  const { error: membersError } = await supabase
    .from('partnership_members')
    .insert([{ partnership_id: partnership.id, user_id: createdBy, role: 'owner' }])

  if (membersError) throw membersError

  return partnership
}

// Sets the partnership name based on member display names (called after invite is accepted)
export async function setPartnershipAutoName(partnershipId: string) {
  const members = await getPartnershipMembers(partnershipId)
  const names = members.map(m => m.displayName.split(' ')[0])
  const name = names.join(' & ')

  const { error } = await supabase
    .from('partnerships')
    .update({ name })
    .eq('id', partnershipId)

  if (error) throw error
  return name
}

export async function renamePartnership(partnershipId: string, name: string) {
  const { error } = await supabase
    .from('partnerships')
    .update({ name: name.trim() })
    .eq('id', partnershipId)

  if (error) throw error
}

export async function generateInviteLink(partnershipId: string): Promise<string> {
  const { data, error } = await supabase
    .from('partnerships')
    .select('invite_token, invite_accepted_at')
    .eq('id', partnershipId)
    .single()

  if (error) throw error

  if (data.invite_token && !data.invite_accepted_at) {
    return `${window.location.origin}/invite/${data.invite_token}`
  }

  // Regenerate token if already accepted
  const newToken = crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('partnerships')
    .update({ invite_token: newToken, invite_accepted_at: null })
    .eq('id', partnershipId)

  if (updateError) throw updateError

  return `${window.location.origin}/invite/${newToken}`
}

export async function getInviteInfo(token: string) {
  const { data, error } = await supabase.rpc('get_invite_preview', {
    p_token: token,
  })

  if (error) throw error
  if (!data) throw new Error('Convite não encontrado')

  return {
    id: data.id,
    invite_accepted_at: data.invite_accepted_at,
    created_by: data.created_by,
    profiles: { display_name: data.inviter_name, email: null },
  }
}

export async function acceptInvite(token: string): Promise<{ partnership_id: string }> {
  const { data, error } = await supabase.rpc('accept_partnership_invite', {
    p_token: token,
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  // Set auto name after both members are present
  try {
    await setPartnershipAutoName(data.partnership_id)
  } catch (err) {
    console.warn('Could not set partnership auto name', err)
  }

  return data
}

export async function getUserPartnerships(uid: string) {
  const { data, error } = await supabase
    .from('partnership_members')
    .select(`
      partnership_id,
      role,
      partnerships (
        id,
        name,
        created_at,
        created_by,
        invite_accepted_at
      )
    `)
    .eq('user_id', uid)

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.partnerships.id,
    name: row.partnerships.name,
    createdAt: row.partnerships.created_at,
    createdBy: row.partnerships.created_by,
    inviteAcceptedAt: row.partnerships.invite_accepted_at,
    role: row.role,
  }))
}

export async function getPartnershipMembers(partnershipId: string) {
  const { data, error } = await supabase
    .from('partnership_members')
    .select('user_id, role')
    .eq('partnership_id', partnershipId)

  if (error) throw error

  // Fetch profiles separately since PostgREST may not resolve the FK correctly
  const userIds = (data ?? []).map(row => row.user_id)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds)

  if (profilesError) throw profilesError

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return (data ?? []).map(row => {
    const profile = profileMap.get(row.user_id)
    return {
      uid: row.user_id,
      role: row.role,
      displayName: profile?.display_name ?? profile?.email ?? 'Usuário',
      email: profile?.email,
    }
  })
}

export async function deletePartnership(partnershipId: string) {
  const { error } = await supabase
    .from('partnerships')
    .delete()
    .eq('id', partnershipId)

  if (error) throw error
}

export function subscribeToPartnerships(
  uid: string,
  onUpdate: (partnerships: any[]) => void,
  onError?: (err: any) => void
) {
  const channelName = `partnerships:${uid}:${crypto.randomUUID()}`

  getUserPartnerships(uid).then(onUpdate).catch(onError)

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'partnership_members',
      filter: `user_id=eq.${uid}`
    }, async () => {
      try {
        const data = await getUserPartnerships(uid)
        onUpdate(data)
      } catch (err) {
        onError?.(err)
      }
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}