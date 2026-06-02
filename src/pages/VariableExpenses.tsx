import React, { useState, useEffect } from 'react'
import { getLocalISODate, formatBRDate } from '../utils/date'
import { useFinanceStore } from '../store/useFinanceStore'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { subscribeToUserSharedAdjustments } from '../services/sharedUserAdjustments'
import { subscribeToSharedGroups } from '../services/sharedGroups'
import { addVariableExpenseToUser, deleteVariableExpenseFromUser, updateVariableExpenseInUser } from '../services/expenses'
import Toast from '../components/Toast'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { currency } from '../utils/finance'

import {
  Pencil,
  Trash2,
  Users,
  ArrowRight,
  ChevronDown
} from 'lucide-react'
import SharedExpenseCard from '../components/SharedExpenseCard'
import VariableExpenseCard from '../components/VariableExpenseCard'

export default function VariableExpenses() {
  const { variableExpenses, addVariableExpense, sharedAdjustments  } = useFinanceStore()
  const setSharedAdjustments = useFinanceStore.getState().setSharedAdjustments
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const todayISO = getLocalISODate()
  const [date, setDate] = useState<string>(todayISO)
  const [category, setCategory] = useState('outros')
  const [toast, setToast] = useState<{ message: string; variant?: 'success'|'error'|'warning'|'info' } | null>(null)
  const [editing, setEditing] = useState<any | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || amount <= 0) {
      setToast({ message: 'Preencha título e valor maior que 0', variant: 'warning' })
      return
    }
    const item = { id: Date.now().toString(), title: title.trim(), amount, category, date }
    addVariableExpense(item as any)
    try {
      if (user) await addVariableExpenseToUser(user.uid, item)
      setToast({ message: 'Gasto adicionado', variant: 'success' })
    } catch (err) {
      setToast({ message: 'Erro ao salvar gasto', variant: 'error' })
    }
    setTitle('')
    setAmount(0)
    setDate(todayISO)
  }

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title?: string } | null>(null)

  const [groupsMap, setGroupsMap] = useState<Record<string, any>>({})
  const navigate = useNavigate()

  // subscribe to user's shared groups and adjustments to show derived cards
  useEffect(() => {
    if (!user) return
    const unsubGroups = subscribeToSharedGroups(user.uid, (groups) => {
      const m: Record<string, any> = {}
      groups.forEach((g: any) => { m[g.id] = g })
      setGroupsMap(m)
    }, (err) => console.error('shared groups error', err))

    const unsubAdj = subscribeToUserSharedAdjustments(user.uid, (adj) => {
      setSharedAdjustments(adj)
    }, (err) => console.error('shared adjustments error', err))

    return () => { unsubGroups && unsubGroups(); unsubAdj && unsubAdj() }
  }, [user])

  async function handleDelete(id: string) {
    if (!user) return
    try {
      await deleteVariableExpenseFromUser(user.uid, id)
      setToast({ message: 'Gasto excluído', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao excluir', variant: 'error' })
    } finally {
      setConfirmDelete(null)
    }
  }

  function openEdit(item: any) {
    setEditing({
      ...item,
      date: item.date || todayISO
    })
  }

  async function saveEdit() {
    if (!user || !editing) return
    try {
      const upd = { title: editing.title, amount: editing.amount, category: editing.category, date: editing.date }
      await updateVariableExpenseInUser(user.uid, editing.id, upd)
      setEditing(null)
      setToast({ message: 'Gasto atualizado', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao atualizar', variant: 'error' })
    }
  }

  function getCategoryLabel(category: string) {
  switch (category) {
    case 'alimentacao':
      return 'Alimentação'
    case 'transporte':
      return 'Transporte'
    case 'lazer':
      return 'Lazer'
    case 'compras':
      return 'Compras'
    case 'saude':
      return 'Saúde'
    default:
      return 'Outros'
  }
  }

  function getCategoryStyles(category: string) {
    switch (category) {
      case 'alimentacao':
        return 'bg-[rgba(96,136,121,0.12)] text-[var(--primary)] border border-[rgba(96,136,121,0.18)]'

      case 'transporte':
        return 'bg-[rgba(93,126,214,0.12)] text-[#5D7ED6] border border-[rgba(93,126,214,0.18)]'

      case 'lazer':
        return 'bg-[rgba(168,93,214,0.12)] text-[#8F5DD6] border border-[rgba(168,93,214,0.18)]'

      case 'compras':
        return 'bg-[rgba(214,168,93,0.12)] text-[var(--warning)] border border-[rgba(214,168,93,0.20)]'

      case 'saude':
        return 'bg-[rgba(95,141,118,0.12)] text-[var(--success)] border border-[rgba(95,141,118,0.20)]'

      default:
        return 'bg-[rgba(138,143,140,0.12)] text-[var(--text-secondary)] border border-[rgba(138,143,140,0.20)]'
    }
  }

  function getDateLabel(dateString: string) {
    const [year, month, day] = dateString
      .split('-')
      .map(Number)

    const target = new Date(
      year,
      month - 1,
      day
    )

    const today = new Date()

    const normalize = (d: Date) =>
      new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
      )

    const diff =
      (normalize(today).getTime() -
        normalize(target).getTime()) /
      (1000 * 60 * 60 * 24)

    if (diff === 0) return 'Hoje'
    if (diff === 1) return 'Ontem'
    if (diff === 2) return 'Anteontem'

    return formatBRDate(dateString)
  }

  const allExpenses = [
    ...sharedAdjustments.map(a => ({
      ...a,
      type: 'shared'
    })),

    ...variableExpenses.map(v => ({
      ...v,
      type: 'expense'
    }))
  ]

  const sortedExpenses = [...allExpenses].sort(
    (a, b) => {
      const aDate = a.date.split('T')[0]
      const bDate = b.date.split('T')[0]

      return (
        new Date(bDate).getTime() -
        new Date(aDate).getTime()
      )
    }
  )

  const groupedExpenses = sortedExpenses.reduce(
    (acc, item) => {
      const key = item.date.split('T')[0]

      if (!acc[key]) {
        acc[key] = []
      }

      acc[key].push(item)

      return acc
    },
    {} as Record<string, typeof allExpenses>
  )
  
  const totalExpenses = allExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  )

  const todayExpenses = allExpenses
    .filter(item => {
      const itemDate = item.date.split('T')[0]
      return itemDate === todayISO
    })
    .reduce(
      (sum, item) => sum + item.amount,
      0
    )

  const totalRecords = allExpenses.length
  
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const monthExpenses = allExpenses
    .filter(item =>
      item.date.startsWith(currentMonthKey)
    )
    .reduce(
      (sum, item) => sum + item.amount,
      0
    )

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          Gastos Variáveis
        </h1>

        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Registre despesas do dia a dia e acompanhe seus gastos.
        </p>
      </div>

      {/* Summary Cards */}
        <section
          className="
            grid
            gap-4
            md:grid-cols-3
          "
        >

          <div
            className="
              rounded-3xl
              border border-[var(--border)]
              bg-[var(--surface)]
              p-5
              shadow-[var(--shadow-soft)]
            "
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Gastos este mês
            </p>

            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {currency.format(monthExpenses)}
            </p>
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
            <p className="text-sm text-[var(--text-secondary)]">
              Gastos hoje
            </p>

            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {currency.format(todayExpenses)}
            </p>
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
            <p className="text-sm text-[var(--text-secondary)]">
              Registros
            </p>

            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
              {totalRecords}
            </p>
          </div>

        </section>

      {/* Add Form */}
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-[var(--shadow-soft)]">
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-4 lg:flex-row lg:items-end"
        >
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Descrição
            </label>

            <input
              placeholder="Ex: Restaurante"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              Data
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="
                appearance-none
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
            />
          </div>

          <div className="w-full lg:w-[180px]">
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Categoria
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4 pr-10
                  appearance-none
                  text-sm text-[var(--text-primary)]
                  outline-none
                  transition
                  focus:border-[var(--primary)]
                  focus:ring-4
                  focus:ring-[rgba(96,136,121,0.10)]
                "
              >
                <option value="alimentacao">Alimentação</option>
                <option value="transporte">Transporte</option>
                <option value="lazer">Lazer</option>
                <option value="compras">Compras</option>
                <option value="saude">Saúde</option>
                <option value="outros">Outros</option>
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
              hover:bg-[var(--primary-hover)]
              hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
              active:scale-[0.99]
            "
          >
            Adicionar
          </button>
        </form>
      </section>

      {/* Expenses */}
      <section className="flex flex-col gap-8">
        {variableExpenses.length === 0 &&
        sharedAdjustments.length === 0 ? (
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
              Nenhum gasto variável cadastrado.
            </p>
          </div>
        ) : (

          Object.entries(groupedExpenses).map(([date, expenses]: [string, any[]]) => {
            const totalDay = expenses.reduce(
              (sum, item) => sum + item.amount,
              0
            )

            return (
              <div key={date} className="flex flex-col gap-4">
                {/* Cabeçalho da data */}
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {getDateLabel(date)}
                  </h2>

                  <div className="mt-2 inline-flex items-center rounded-full bg-[rgba(96,136,121,0.12)] px-3 py-1 text-sm font-medium text-[var(--primary)]">
                    Total do dia: {currency.format(totalDay)}
                  </div>

                  <div className="mt-1 h-px bg-[var(--divider)]" />
                </div>

                {/* Cards daquele dia */}
                {expenses.map((item) => {
                  if (item.type === 'shared') {
                    const gid = item.groupId
                    const group = gid ? groupsMap[gid] : null

                    return (
                      <SharedExpenseCard
                        key={item.id}
                        expense={item}
                        groupName={group?.name}
                        onOpen={() =>
                          gid && navigate(`/shared/${gid}`)
                        }
                      />
                    )
                  }

                  return (
                    <VariableExpenseCard
                      key={item.id}
                      expense={item}
                      categoryLabel={getCategoryLabel(item.category)}
                      categoryStyles={getCategoryStyles(item.category)}
                      onEdit={() => openEdit(item)}
                      onDelete={() =>
                        setConfirmDelete({
                          id: item.id,
                          title: item.title
                        })
                      }
                    />
                  )
                })}
              </div>
            )
          })
        )}
      </section>

      {editing && (
        <Modal
          title="Editar gasto variável"
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveEdit()
            }}
            className="space-y-5"
          >

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Descrição
              </label>

              <input
                value={editing.title}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    title: e.target.value
                  })
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
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Valor
              </label>

              <CurrencyInput
                value={editing.amount}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    amount: v
                  })
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
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Data
              </label>

              <input
                type="date"
                value={editing.date}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    date: e.target.value
                  })
                }
                className="
                  appearance-none
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
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Categoria
              </label>

              <div className="relative">
                <select
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      category: e.target.value
                    })
                  }
                  className="
                    h-12 w-full rounded-2xl
                    border border-[var(--border)]
                    bg-[var(--surface)]
                    px-4 pr-10
                    appearance-none
                    text-sm text-[var(--text-primary)]
                    outline-none
                    transition
                    focus:border-[var(--primary)]
                    focus:ring-4
                    focus:ring-[rgba(96,136,121,0.10)]
                  "
                >
                  <option value="alimentacao">Alimentação</option>
                  <option value="transporte">Transporte</option>
                  <option value="lazer">Lazer</option>
                  <option value="compras">Compras</option>
                  <option value="saude">Saúde</option>
                  <option value="outros">Outros</option>
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

            <div className="flex justify-end gap-3">

              <button
                type="button"
                onClick={() => setEditing(null)}
                className="
                  h-11 rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-5
                  text-sm font-medium
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
        title="Excluir gasto"
        message="Tem certeza que deseja excluir este gasto? Essa ação não poderá ser desfeita."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() =>
          confirmDelete && handleDelete(confirmDelete.id)
        }
      />

      <Toast
        message={toast ?? undefined}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
