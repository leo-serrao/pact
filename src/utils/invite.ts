const INVITE_TOKEN_KEY = 'pact_pending_invite'

export function savePendingInvite(token: string) {
  localStorage.setItem(INVITE_TOKEN_KEY, token)
}

export function getPendingInvite(): string | null {
  return localStorage.getItem(INVITE_TOKEN_KEY)
}

export function clearPendingInvite() {
  localStorage.removeItem(INVITE_TOKEN_KEY)
}