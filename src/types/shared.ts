export interface Partnership {
  id: string
  name: string
  createdAt: string
  createdBy: string
  role: 'owner' | 'member'
}

export interface PartnershipMember {
  uid: string
  role: 'owner' | 'member'
  displayName: string
  email?: string
}

export interface SharedExpense {
  id: string
  partnership_id: string
  title: string
  amount: number
  paid_by: string
  date: string
  note?: string
  created_at: string
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

export interface DebtSettlement {
  id: string
  partnership_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  date: string
  note?: string
  created_at: string
}