import { supabase } from './supabase'

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, any> | null
  read_at: string | null
  created_at: string
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw error
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
}

export async function deleteAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .not('read_at', 'is', null)

  if (error) throw error
}

export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void,
  onError?: (err: any) => void
) {
  fetchNotifications(userId).then(onUpdate).catch(onError)

  const channel = supabase
    .channel(`notifications:${userId}:${crypto.randomUUID()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, async () => {
      try {
        const data = await fetchNotifications(userId)
        onUpdate(data)
      } catch (err) {
        onError?.(err)
      }
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}