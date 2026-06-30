/// <reference lib="webworker" />
export {}

declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)

type PushPayload = {
  title: string
  body: string | null
  data: {
    type: string
    url: string
    notificationId: string
  }
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const payload: PushPayload = event.data.json()

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body ?? undefined,
      icon: '/pwa-192x192.svg',
      data: payload.data,
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await (client as WindowClient).navigate(url)
          return
        }
      }

      await self.clients.openWindow(url)
    })()
  )
})
