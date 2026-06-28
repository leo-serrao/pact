import React, { useMemo, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import ConfirmModal from '../components/ConfirmModal'
import { addSavingBoxToUser, updateSavingBoxInUser, deleteSavingBoxFromUser } from '../services/savingBoxes'
import { calculate50_30_20 } from '../utils/finance'

import {
  Pencil,
  Trash2
} from 'lucide-react'

export default function Boxes() {
  const { profile, savingBoxes, addSavingBox, updateSavingBox, removeSavingBox } = useFinanceStore()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState<string>('')
  const [amount, setAmount] = useState<number>(0)
  const [toast, setToast] = useState<{ message: string; variant?: 'success'|'error'|'warning'|'info' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name?: string } | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const netSalary = profile?.netSalary ?? 0
  const savingsPercent = profile?.savingsPercent ?? 0.2
  const recommended = calculate50_30_20(netSalary, [], savingsPercent).savings

  const totalDistributed = useMemo(() => savingBoxes.reduce((s, b) => s + b.amount, 0), [savingBoxes])
  const remaining = Math.round((recommended - totalDistributed) * 100) / 100

  function openNew() {
    setFormError(null)
    setEditing(null)
    setName('')
    setEmoji('')
    setAmount(0)
    setOpen(true)
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim() || amount <= 0) { setToast({ message: 'Preencha nome e valor maior que 0', variant: 'warning' }); return }
    const currentAmount = editing?.amount ?? 0
    const newTotal = totalDistributed - currentAmount + amount
    if (newTotal > recommended) {
      setFormError(
        'O valor total das caixinhas ultrapassa o recomendado para guardar.'
      )

      return
    }
    setFormError(null)
    const box = {
      name: name.trim(),
      amount,
      emoji: emoji || undefined
    }
    try {
      if (user) {
        if (editing) {
          await updateSavingBoxInUser(user.id, editing.id, box)
          updateSavingBox({ ...editing, ...box })
        } else {
          const result = await addSavingBoxToUser(user.id, box)
          addSavingBox({ id: result.id, name: result.name, amount: result.amount, emoji: result.emoji ?? undefined, createdAt: result.created_at })
        }
      }
      setToast({ message: editing ? 'Caixinha atualizada' : 'Caixinha criada', variant: 'success' })
      setOpen(false)
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao salvar caixinha', variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Caixinhas
          </h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Organize seus objetivos financeiros e distribua sua reserva mensal.
          </p>
        </div>

        <button
          onClick={openNew}
          className="
            h-12 w-full sm:w-auto
            rounded-2xl
            bg-[var(--primary)]
            px-5
            text-sm font-medium text-white
          "
        >
          Nova caixinha
        </button>
      </div>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3">

        <div
          className="
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-5
            shadow-[var(--shadow-soft)]
          "
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Recomendado para guardar
          </div>

          <div className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            R$ {recommended.toFixed(2)}
          </div>
        </div>

        <div
          className="
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-5
            shadow-[var(--shadow-soft)]
          "
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Total em caixinhas
          </div>

          <div className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            R$ {totalDistributed.toFixed(2)}
          </div>
        </div>

        <div
          className={`
            rounded-3xl
            border
            bg-[var(--surface)]
            p-5
            shadow-[var(--shadow-soft)]
            ${
              remaining < 0
                ? 'border-red-300'
                : 'border-[var(--border)]'
            }
          `}
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Restante não distribuído
          </div>

          <div
            className={`
              mt-2 text-2xl font-semibold tracking-tight
              ${
                remaining < 0
                  ? 'text-red-500'
                  : 'text-[var(--text-primary)]'
              }
            `}
          >
            R$ {remaining.toFixed(2)}
          </div>
        </div>

      </section>

      {/* Boxes */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {savingBoxes.length === 0 ? (
          <div
            className="
              col-span-full
              rounded-3xl
              border border-dashed border-[var(--border)]
              bg-[var(--surface)]
              p-10
              text-center
              shadow-[var(--shadow-soft)]
            "
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhuma caixinha criada.
            </p>
          </div>
        ) : (
          savingBoxes.map((b) => (
            <div
              key={b.id}
              className="
                rounded-3xl
                border border-[var(--border)]
                bg-[var(--surface)]
                p-5
                shadow-[var(--shadow-soft)]
                transition-all duration-200
                hover:border-[var(--primary)]
                hover:shadow-[0_12px_28px_rgba(0,0,0,0.05)]
              "
            >
              <div className="flex items-start justify-between gap-4">

                <div className="flex-1 min-w-0">

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex h-12 w-12 items-center justify-center
                        rounded-2xl
                        bg-[var(--surface-secondary)]
                        border border-[var(--border)]
                      "
                    >
                      <span className="text-2xl">
                        {b.emoji ?? '💰'}
                      </span>
                    </div>

                    <div className="min-w-0">

                      <div className="truncate text-base font-semibold text-[var(--text-primary)]">
                        {b.name}
                      </div>

                      <div className="text-sm text-[var(--text-secondary)]">
                        {((b.amount / recommended) * 100).toFixed(0)}% da reserva recomendada
                      </div>

                    </div>

                  </div>

                  <div className="mt-5">

                    <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      Valor reservado
                    </div>

                    <div className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                      R$ {b.amount.toFixed(2)}
                    </div>

                  </div>

                </div>

                <div className="flex items-start gap-1">

                  <button
                    onClick={() => {
                      setFormError(null)
                      setEditing(b)
                      setName(b.name)
                      setEmoji(b.emoji ?? '')
                      setAmount(b.amount)
                      setOpen(true)
                    }}
                    className="
                      flex h-9 w-9 items-center justify-center
                      rounded-xl
                      text-[var(--primary)]
                      transition-colors
                      hover:bg-[var(--surface-secondary)]
                    "
                  >
                    <Pencil size={16} strokeWidth={2} />
                  </button>

                  <button
                    onClick={() =>
                      setConfirmDelete({
                        id: b.id,
                        name: b.name
                      })
                    }
                    className="
                      flex h-9 w-9 items-center justify-center
                      rounded-xl
                      text-red-500
                      transition-colors
                      hover:bg-red-50
                      dark:hover:bg-red-950/20
                    "
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>

                </div>

              </div>
            </div>
          ))
        )}
      </section>

      {open && (
        <Modal
          title={editing ? 'Editar caixinha' : 'Nova caixinha'}
          onClose={() => {
            setFormError(null)
            setOpen(false)
          }}
        >
          {formError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20">
              {formError}
            </div>
          )}
          <form
            onSubmit={(e) => handleSave(e)}
            className="space-y-5"
          >

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Nome
              </label>

              <input
                placeholder="Ex: Viagem"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-base text-[var(--text-primary)]
                  outline-none
                  transition
                  placeholder:text-[var(--text-muted)]
                  focus:border-[var(--primary)]
                  focus:ring-4
                  focus:ring-[rgba(96,136,121,0.10)]
                "
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Emoji (opcional)
              </label>

              <input
                placeholder="🚗"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-base text-[var(--text-primary)]
                  outline-none
                  transition
                  placeholder:text-[var(--text-muted)]
                  focus:border-[var(--primary)]
                  focus:ring-4
                  focus:ring-[rgba(96,136,121,0.10)]
                "
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {['🚗','✈️','🆘','💻','🏠','🎮','📱'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className="
                      flex h-10 w-10 items-center justify-center
                      rounded-xl
                      border border-[var(--border)]
                      bg-[var(--surface)]
                      transition-colors
                      hover:bg-[var(--surface-secondary)]
                    "
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Valor
              </label>

              <CurrencyInput
                value={amount}
                onChange={setAmount}
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-base text-[var(--text-primary)]
                  outline-none
                  transition
                  focus:border-[var(--primary)]
                  focus:ring-4
                  focus:ring-[rgba(96,136,121,0.10)]
                "
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">

              <button
                type="button"
                onClick={() => {
                  setFormError(null)
                  setOpen(false)
                }}
                className="
                  h-11 rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-5
                  text-sm font-medium
                  text-[var(--text-primary)]
                  transition
                  hover:bg-[var(--surface-secondary)]
                "
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="
                  h-11 rounded-2xl
                  bg-[var(--primary)]
                  px-5
                  text-sm font-medium text-white
                  transition-all duration-200
                  hover:bg-[var(--primary-hover)]
                  hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
                "
              >
                Salvar
              </button>

            </div>

          </form>
        </Modal>
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir caixinha"
        message={`Tem certeza que deseja excluir ${confirmDelete?.name ?? 'esta caixinha'}?`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!user || !confirmDelete) return

          try {
            await deleteSavingBoxFromUser(
              user.id,
              confirmDelete.id
            )

            removeSavingBox(confirmDelete.id)

            setToast({
              message: 'Caixinha excluída',
              variant: 'success'
            })
          } catch (err) {
            console.error(err)

            setToast({
              message: 'Erro ao excluir caixinha',
              variant: 'error'
            })
          } finally {
            setConfirmDelete(null)
          }
        }}
      />

      <Toast
        message={toast}
        onClose={() => setToast(null)}
      />

    </div>
  )
}
