export const FIXED_EXPENSE_CATEGORIES = [
  { value: 'bills', label: 'Contas' },
  { value: 'subscriptions', label: 'Assinaturas' }
] as const

export type FixedExpenseCategory = 'bills' | 'subscriptions'

export type FixedExpense = {
  id: string
  name: string
  amount: number
  category: FixedExpenseCategory
}

export type VariableExpense = {
  id: string
  title: string
  amount: number
  category: string
  date: string
  note?: string
}

export type Profile = {
  uid: string
  email?: string
  displayName?: string
  netSalary: number
  payDay: number
  savingsPercent: number
}

export type SavingBox = {
  id: string
  name: string
  amount: number
  createdAt: string
  emoji?: string
}