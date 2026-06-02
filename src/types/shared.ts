export interface SharedGroup {
  id?: string
  name: string
  members: string[]
  createdAt: string
}

export interface SharedExpense {
  id?: string
  title: string
  amount: number
  paidBy: string
  participants: string[]
  createdAt: string
  date: string
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

export interface DebtSettlement {
  id?: string
  fromUserId: string
  toUserId: string
  amount: number
  groupId: string
  createdAt: string
}
