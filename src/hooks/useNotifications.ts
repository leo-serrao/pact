import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Notification,
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from '../services/notifications'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeToNotifications(
      user.id,
      (data) => {
        setNotifications(data)
        setLoading(false)
      },
      (err) => {
        console.error('notifications error', err)
        setLoading(false)
      }
    )

    return () => { unsub() }
  }, [user])

  const unreadCount = notifications.filter(n => !n.read_at).length
  const hasRead = notifications.some(n => !!n.read_at)

  const handleMarkAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    )
    await markAsRead(id)
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user) return
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    )
    await markAllAsRead(user.id)
  }, [user])

  const handleDelete = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await deleteNotification(id)
  }, [])

  const handleDeleteAllRead = useCallback(async () => {
    if (!user) return
    setNotifications(prev => prev.filter(n => !n.read_at))
    await deleteAllRead(user.id)
  }, [user])

  return {
    notifications,
    unreadCount,
    hasRead,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDelete,
    deleteAllRead: handleDeleteAllRead,
  }
}