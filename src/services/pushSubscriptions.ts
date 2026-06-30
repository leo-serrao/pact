import { supabase } from './supabase'

export type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
  last_seen_at: string
}

export async function upsertSubscription(
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

  if (error) throw error
}

export async function deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) throw error
}
