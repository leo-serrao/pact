import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import * as webpush from "jsr:@negrel/webpush"
import { resolveDeepLink } from "./resolveDeepLink.ts"

interface NotificationRecord {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
}

interface WebhookPayload {
  type: "INSERT"
  table: "notifications"
  record: NotificationRecord
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

const appServerPromise = webpush.ApplicationServer.new({
  contactInformation: `mailto:${Deno.env.get("VAPID_SUBJECT_EMAIL")}`,
  vapidKeys: {
    publicKey: Deno.env.get("VAPID_PUBLIC_KEY")!,
    privateKey: Deno.env.get("VAPID_PRIVATE_KEY")!,
  },
})

Deno.serve(async (req: Request) => {
  const payload: WebhookPayload = await req.json()
  const notification = payload.record

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
  }

  const url = resolveDeepLink(notification.type, notification.data)
  const message = JSON.stringify({
    title: notification.title,
    body: notification.body,
    data: {
      type: notification.type,
      url,
      notificationId: notification.id,
    },
  })

  const appServer = await appServerPromise
  const staleSubscriptionIds: string[] = []

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        })
        await subscriber.pushTextMessage(message, {})
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          staleSubscriptionIds.push(sub.id)
        }
      }
    }),
  )

  if (staleSubscriptionIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleSubscriptionIds)
  }

  return new Response(
    JSON.stringify({ sent: subscriptions.length - staleSubscriptionIds.length, removed: staleSubscriptionIds.length }),
    { status: 200 },
  )
})
