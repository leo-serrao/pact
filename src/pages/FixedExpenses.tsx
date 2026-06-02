import React, { useEffect, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import {
  addFixedExpenseToUser,
  deleteFixedExpenseFromUser,
  updateFixedExpenseInUser
} from '../services/expenses'

import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'

import { Pencil, Trash2, ChevronDown } from 'lucide-react'
import { FIXED_EXPENSE_CATEGORIES } from '../types'
import { currency } from '../utils/finance'

export default function FixedExpenses() {
  const { fixedExpenses, addFixedExpense } = useFinanceStore()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [category, setCategory] =   useState<'bills' | 'subscriptions'>('bills')

  function getCategoryLabel(
    category: 'bills' | 'subscriptions'
  ) {
    switch (category) {
      case 'bills':
        return 'Contas'

      case 'subscriptions':
        return 'Assinaturas'

      default:
        return category
    }
  }

  const [toast, setToast] = useState<{
    message: string
    variant?: 'success' | 'error' | 'warning' | 'info'
    actionLabel?: string
    onAction?: () => void
  } | null>(null)

  const [editing, setEditing] = useState<any | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    name?: string
  } | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || amount <= 0) {
      setToast({
        message: 'Preencha nome e valor maior que 0',
        variant: 'warning'
      })

      return
    }

    const item = {
      id: Date.now().toString(),
      name: name.trim(),
      amount,
      category
    }

    addFixedExpense(item as any)

    if (user) {
      await addFixedExpenseToUser(user.uid, item)
    }

    setToast({
      message: 'Gasto adicionado',
      variant: 'success'
    })

    setName('')
    setAmount(0)
    setCategory('bills')
  }

  return (
    <div className="flex flex-col gap-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          Gastos Fixos
        </h1>

        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gerencie despesas recorrentes mensais.
        </p>
      </div>

      {/* Add form */}
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-[var(--shadow-soft)]">

        <form onSubmit={handleAdd} className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Nome
            </label>

            <input
              placeholder="Ex: Aluguel"
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

          <div className="w-full lg:w-[180px]">
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

          <div className="w-full lg:w-[180px]">
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Categoria
            </label>
            
            <div className="relative">
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as 'bills' | 'subscriptions')
                }
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  appearance-none
                  text-sm text-[var(--text-primary)]
                  outline-none
                  transition
                  focus:border-[var(--primary)]
                  focus:ring-4
                  focus:ring-[rgba(96,136,121,0.10)]
                "
              >
                {FIXED_EXPENSE_CATEGORIES.map(category => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                  size={16}
                  className="
                    pointer-events-none
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    text-[var(--text-muted)]
                  "
              />
            </div>
          </div>

          <button
            className="
              h-12 rounded-2xl
              bg-[var(--primary)]
              px-5
              text-sm font-medium text-white
              transition-all duration-200
              hover:bg-[var(--primaryHover)]
              hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
              active:scale-[0.99]
            "
          >
            Adicionar
          </button>
        </form>
      </section>

      {/* Expenses list */}
      <section className="flex flex-col gap-4">
        {fixedExpenses.length === 0 ? (
          <div
            className="
              rounded-3xl
              border border-dashed border-[var(--border)]
              bg-[var(--surface)]
              p-10
              text-center
              shadow-[var(--shadow-soft)]
            "
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhum gasto fixo cadastrado.
            </p>
          </div>
        ) : (
          fixedExpenses.map((f) => (
            <div
              key={f.id}
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
                
                {/* Left */}
                <div className="min-w-0 flex-1">
                  
                  <div className="break-words text-base font-semibold leading-6 text-[var(--text-primary)]">
                    {f.name}
                  </div>

                  <div className="mt-2">
                    <span
                      className={`
                        inline-flex items-center rounded-full
                        px-3 py-1 text-xs font-medium
                        ${
                          f.category === 'bills'
                            ? `bg-[rgba(96,136,121,0.12)] text-[var(--primary)] border border-[rgba(96,136,121,0.18)]`
                            : `bg-[rgba(214,168,93,0.12)] text-[var(--warning)] border border-[rgba(214,168,93,0.20)]`
                        }
                      `}
                    >
                      {getCategoryLabel(f.category)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    
                    <div className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                      {currency.format(f.amount)}
                    </div>

                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-start gap-1 sm:items-center">
                  <button
                    onClick={() => setEditing(f)}
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
                        id: f.id,
                        name: f.name,
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

      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir gasto"
        message="Tem certeza que deseja excluir este gasto? Essa ação não poderá ser desfeita."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!user || !confirmDelete) return

          try {
            await deleteFixedExpenseFromUser(
              user.uid,
              confirmDelete.id
            )

            setToast({
              message: 'Gasto excluído',
              variant: 'success'
            })
          } catch (err) {
            console.error(err)

            setToast({
              message: 'Erro ao excluir',
              variant: 'error'
            })
          } finally {
            setConfirmDelete(null)
          }
        }}
      />

      {editing && (
        <Modal
          title="Editar gasto fixo"
          onClose={() => setEditing(null)}
        >
          <EditFixedForm
            item={editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null)

              setToast({
                message: 'Gasto atualizado',
                variant: 'success'
              })
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function EditFixedForm({
  item,
  onCancel,
  onSaved
}: {
  item: any
  onCancel: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()

  const [name, setName] = useState(item.name || '')
  const [amount, setAmount] = useState<number>(item.amount || 0)
  const [category, setCategory] =  useState<'bills' | 'subscriptions'>(item.category || 'bills')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(item.name || '')
    setAmount(item.amount || 0)
    setCategory(item.category || 'bills')
  }, [item])

  async function save() {
    if (!name.trim() || amount <= 0) {
      setError('Nome obrigatório e valor > 0')
      return
    }

    setError(null)

    try {
      if (user) {
        await updateFixedExpenseInUser(
          user.uid,
          item.id,
          {
            name: name.trim(),
            amount,
            category
          }
        )
      }

      onSaved()
    } catch (err) {
      console.error(err)
      setError('Erro ao salvar')
    }
  }

  return (
    <div className="space-y-5">
      
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
          Nome
        </label>

        <input
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
            focus:border-[var(--primary)]
            focus:ring-4
            focus:ring-[rgba(96,136,121,0.10)]
          "
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
          Valor
        </label>

        <CurrencyInput
          value={amount}
          onChange={(v) => setAmount(v)}
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

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
          Categoria
        </label>

        <select
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value as 'bills' | 'subscriptions'
            )
          }
          className="
            h-12 w-full rounded-2xl
            border border-[var(--border)]
            bg-[var(--surface)]
            px-4
            text-sm text-[var(--text-primary)]
            outline-none
            transition
            focus:border-[var(--primary)]
            focus:ring-4
            focus:ring-[rgba(96,136,121,0.10)]
          "
        >
          {FIXED_EXPENSE_CATEGORIES.map(category => (
            <option
              key={category.value}
              value={category.value}
            >
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        
        <button
          onClick={onCancel}
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
          onClick={save}
          className="
            h-11 rounded-2xl
            bg-[var(--primary)]
            px-5
            text-sm font-medium text-white
            transition-all duration-200
            hover:bg-[var(--primaryHover)]
            hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
          "
        >
          Salvar
        </button>

      </div>
    </div>
  )
}