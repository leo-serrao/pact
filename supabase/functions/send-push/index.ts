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

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=")
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// @negrel/webpush's ApplicationServer requires vapidKeys as a real
// CryptoKeyPair, not the raw base64url strings the VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY secrets are stored as (same raw EC P-256 format the
// `web-push` npm package generates). Reconstruct the JWK manually from the
// raw public point (0x04 + x + y) and private scalar (d) instead.
async function importRawVapidKeys(publicKeyB64: string, privateKeyB64: string): Promise<CryptoKeyPair> {
  const publicBytes = base64UrlToUint8Array(publicKeyB64)
  const privateBytes = base64UrlToUint8Array(privateKeyB64)

  const jwkPublic: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(publicBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(publicBytes.slice(33, 65)),
    ext: true,
  }

  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey("jwk", jwkPublic, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]),
    crypto.subtle.importKey(
      "jwk",
      { ...jwkPublic, d: uint8ArrayToBase64Url(privateBytes) },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    ),
  ])

  return { publicKey, privateKey }
}

const appServerPromise = importRawVapidKeys(
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
).then((vapidKeys) =>
  webpush.ApplicationServer.new({
    contactInformation: `mailto:${Deno.env.get("VAPID_SUBJECT_EMAIL")}`,
    vapidKeys,
  })
)

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
  let failedCount = 0

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
        } else {
          failedCount++
          console.error(`push failed for subscription ${sub.id} (endpoint: ${sub.endpoint}):`, err)
        }
      }
    }),
  )

  if (staleSubscriptionIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleSubscriptionIds)
  }

  return new Response(
    JSON.stringify({
      sent: subscriptions.length - staleSubscriptionIds.length - failedCount,
      removed: staleSubscriptionIds.length,
      failed: failedCount,
    }),
    { status: 200 },
  )
})
