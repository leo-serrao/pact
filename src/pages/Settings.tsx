import React, { useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import {
  setUserProfile
} from '../services/firestore'
import {
  deleteFixedExpenseFromUser,
  addFixedExpenseToUser,
  updateFixedExpenseInUser
} from '../services/expenses'

import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

export default function Settings() {
  const { profile, fixedExpenses, setProfile } = useFinanceStore()
  const { user } = useAuth()

  const [netSalary, setNetSalary] = useState<number>(profile?.netSalary ?? 0)
  const [payDay, setPayDay] = useState<number>(profile?.payDay ?? 1)
  const [savingsPct, setSavingsPct] = useState<number>((profile?.savingsPercent ?? 0.2) * 100)
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')

  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number>(0)

  const [toast, setToast] = useState<any>(null)
  const [editing, setEditing] = useState<any | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null)

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const data = {
      netSalary,
      payDay,
      savingsPercent: (savingsPct ?? 20) / 100,
      displayName: displayName || undefined
    }

    try {
      await setUserProfile(user.uid, data)

      setProfile({
        uid: user.uid,
        email: user.email ?? undefined,
        displayName: data.displayName ?? profile?.displayName,
        ...data
      } as any)

      setToast({ message: 'Perfil atualizado', variant: 'success' })
    } catch {
      setToast({ message: 'Erro ao salvar perfil', variant: 'error' })
    }
  }

  async function handleAddFixed(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    if (!name.trim() || amount <= 0) {
      setToast({ message: 'Nome e valor válidos são obrigatórios', variant: 'warning' })
      return
    }

    const item = {
      name: name.trim(),
      amount,
      category: ''
    }

    try {
      await addFixedExpenseToUser(user.uid, item)
      setName('')
      setAmount(0)
    } catch {
      setToast({ message: 'Erro ao adicionar gasto', variant: 'error' })
    }
  }

  async function confirmDeleteFixed(id: string) {
    if (!user) return

    try {
      await deleteFixedExpenseFromUser(user.uid, id)

      setToast({
        message: 'Gasto removido',
        variant: 'success',
        actionLabel: 'Desfazer',
        onAction: async () => {
          const found = fixedExpenses.find(f => f.id === id)
          if (!found) return

          await addFixedExpenseToUser(user.uid, found)
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

      {/* HEADER */}
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)]">
          Configurações
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Gerencie seu perfil e preferências financeiras.
        </p>
      </div>

      {/* PROFILE CARD */}
      <section className="card p-6 md:p-8">
        <form
          onSubmit={handleSaveProfile}
          className="grid gap-5 md:grid-cols-2"
        >

          <div className="md:col-span-2">
            <label className="text-sm text-[var(--text-secondary)]">
              Nome exibido
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)]">
              Salário líquido
            </label>
            <CurrencyInput
              value={netSalary}
              onChange={setNetSalary}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div>
            <label className="text-sm text-[var(--text-secondary)]">
              Dia de recebimento
            </label>
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
            <label className="text-sm text-[var(--text-secondary)]">
              % de poupança
            </label>
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
            <button className="button-primary">
              Salvar perfil
            </button>
          </div>

        </form>
      </section>

      {/* MODALS */}
      {editing && (
        <Modal title="Editar gasto" onClose={() => setEditing(null)}>
          <div className="space-y-3">

            <input
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              className="h-12 w-full px-4"
            />

            <CurrencyInput
              value={editing.amount}
              onChange={v => setEditing({ ...editing, amount: v })}
              className="h-12 w-full px-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="button-secondary"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (!user) return
                  await updateFixedExpenseInUser(user.uid, editing.id, editing)
                  setEditing(null)
                }}
                className="button-primary"
              >
                Salvar
              </button>
            </div>

          </div>
        </Modal>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir gasto"
        message={`Excluir ${confirmDelete?.name}?`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() =>
          confirmDelete && confirmDeleteFixed(confirmDelete.id)
        }
      />

      {toast && (
        <Toast message={toast} onClose={() => setToast(null)} />
      )}

    </div>
  )
}