import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { upsertSubscription } from '../services/pushSubscriptions'

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function usePushSubscription() {
  const { user } = useAuth()
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default')

  const isIosNonInstalled = isIos() && !isStandalonePwa()
  const unsupported = !isPushSupported() || (isIos() && !isStandalonePwa())

  useEffect(() => {
    if (!isPushSupported()) {
      setPermissionState('unsupported')
      return
    }
    setPermissionState(Notification.permission as PushPermissionState)
  }, [])

  const subscribeAndPersist = useCallback(async () => {
    if (!user || unsupported) return

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
    await upsertSubscription(user.id, json)
  }, [user, unsupported])

  const requestPermission = useCallback(async () => {
    if (unsupported) return

    const result = await Notification.requestPermission()
    setPermissionState(result as PushPermissionState)

    if (result === 'granted') {
      await subscribeAndPersist()
    }
  }, [unsupported, subscribeAndPersist])

  const ensureSubscribed = useCallback(async () => {
    if (unsupported || Notification.permission !== 'granted') return
    await subscribeAndPersist()
  }, [unsupported, subscribeAndPersist])

  return {
    permissionState: unsupported ? 'unsupported' : permissionState,
    isIosNonInstalled,
    requestPermission,
    ensureSubscribed,
  }
}
