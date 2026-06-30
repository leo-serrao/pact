export interface NotificationDataPayload {
  partnership_id?: string
  [key: string]: unknown
}

export function resolveDeepLink(type: string, data: NotificationDataPayload | null): string {
  const partnershipId = data?.partnership_id
  if (typeof partnershipId !== 'string' || !partnershipId) return '/'

  switch (type) {
    case 'new_shared_expense':
    case 'debt_settled':
    case 'partner_joined':
      return `/shared/${partnershipId}`
    default:
      return '/'
  }
}
