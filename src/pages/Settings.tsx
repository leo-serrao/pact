import React, { useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import { setUserProfile } from '../services/profile'
import {
  deleteFixedExpenseFromUser,
  addFixedExpenseToUser,
  updateFixedExpenseInUser
} from '../services/expenses'

import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { FIXED_EXPENSE_CATEGORIES } from '../types'

export default function Settings() {
  const { profile, fixedExpenses, setProfile, updateFixedExpense } = useFinanceStore()
  const { user } = useAuth()

  const [netSalary, setNetSalary] = useState<number>(profile?.netSalary ?? 0)
  const [payDay, setPayDay] = useState<number>(profile?.payDay ?? 1)
  const [savingsPct, setSavingsPct] = useState<number>((profile?.savingsPercent ?? 0.2) * 100)
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')

  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState<number>(0)
  const [newCategory, setNewCategory] = useState<'bills' | 'subscriptions'>('bills')

  const [toast, setToast] = useState<any>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    try {
      await setUserProfile(user.id, {
        display_name: displayName || undefined,
        net_salary: netSalary,
        pay_day: payDay,
        savings_percent: (savingsPct ?? 20) / 100,
      })

      setProfile({
        uid: user.id,
        email: user.email ?? undefined,
        displayName: displayName || profile?.displayName,
        netSalary,
        payDay,
        savingsPercent: (savingsPct ?? 20) / 100,
      })

      setToast({ message: 'Perfil atualizado', variant: 'success' })
    } catch {
      setToast({ message: 'Erro ao salvar perfil', variant: 'error' })
    }
  }

  async function handleAddFixed(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (!newName.trim() || newAmount <= 0) {
      setToast({ message: 'Nome e valor válidos são obrigatórios', variant: 'warning' })
      return
    }

    try {
      await addFixedExpenseToUser(user.id, {
        name: newName.trim(),
        amount: newAmount,
        category: newCategory,
      })
      setNewName('')
      setNewAmount(0)
      setNewCategory('bills')
      setToast({ message: 'Gasto fixo adicionado', variant: 'success' })
    } catch {
      setToast({ message: 'Erro ao adicionar gasto', variant: 'error' })
    }
  }

  async function handleSaveEditing() {
    if (!user || !editing) return

    try {
      await updateFixedExpenseInUser(user.id, editing.id, {
        name: editing.name,
        amount: editing.amount,
        category: editing.category,
      })
      updateFixedExpense(editing)
      setEditing(null)
      setToast({ message: 'Gasto atualizado', variant: 'success' })
    } catch {
      setToast({ message: 'Erro ao atualizar gasto', variant: 'error' })
    }
  }

  async function confirmDeleteFixed(id: string) {
    if (!user) return

    const found = fixedExpenses.find(f => f.id === id)

    try {
      await deleteFixedExpenseFromUser(user.id, id)

      setToast({
        message: 'Gasto removido',
        variant: 'success',
        actionLabel: 'Desfazer',
        onAction: async () => {
          if (!found) return
          await addFixedExpenseToUser(user.id, found)
          setToast({ message: 'Exclusão revertida', variant: 'success' })
        }
      })
    } catch {
      setToast({ message: 'Erro ao excluir', variant: 'error' })
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)]">
          Configurações
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Gerencie seu perfil e preferências financeiras.
        </p>
      </div>

      {/* Profile card */}
      <section className="card p-6 md:p-8">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">
          Perfil
        </h2>
        <form onSubmit={handleSaveProfile} className="grid gap-5 md:grid-cols-2">

          <div className="md:col-span-2">
            <label className="text-sm text-[var(--text-secondary)]">Nome exibido</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)]">Salário líquido</label>
            <CurrencyInput
              value={netSalary}
              onChange={setNetSalary}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)]">Dia de recebimento</label>
            <input
              type="number"
              min={1}
              max={31}
              value={payDay}
              onChange={e => setPayDay(Number(e.target.value))}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-[var(--text-secondary)]">% de poupança</label>
            <input
              type="number"
              min={0}
              max={100}
              value={savingsPct}
              onChange={e => setSavingsPct(Number(e.target.value))}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button type="submit" className="button-primary">
              Salvar perfil
            </button>
          </div>

        </form>
      </section>

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir gasto"
        message={`Excluir "${confirmDelete?.name}"?`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && confirmDeleteFixed(confirmDelete.id)}
      />

      {toast && (
        <Toast message={toast} onClose={() => setToast(null)} />
      )}

    </div>
  )
}