import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { Partnership, PartnershipMember, SharedExpense, DebtSettlement } from '../types/shared'
import {
  subscribeToSharedExpenses,
  createSharedExpense,
  deleteSharedExpense,
  updateSharedExpense
} from '../services/sharedExpenses'
import {
  calculateBalances,
  calculateSettlements,
  applyPaymentsToSettlements
} from '../services/sharedBalance'
import {
  subscribeToDebtSettlements,
  createDebtSettlement,
  deleteDebtSettlement
} from '../services/debtSettlements'
import { getPartnershipMembers } from '../services/sharedGroups'
import CurrencyInput from '../components/CurrencyInput'
import { formatBRDate, getLocalISODate } from '../utils/date'
import SharedExpensePageCard from '../components/SharedExpensePageCard'
import { ChevronDown } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'

export default function SharedGroupDetails() {
  const { groupId } = useParams()
  const { user } = useAuth()

  const [partnership, setPartnership] = useState<Partnership | null>(null)
  const [members, setMembers] = useState<PartnershipMember[]>([])
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [payments, setPayments] = useState<DebtSettlement[]>([])
  const [toast, setToast] = useState<{
    message: string
    variant?: 'success' | 'error' | 'warning' | 'info'
  } | null>(null)

  const [openNew, setOpenNew] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    amount: 0,
    paid_by: '',
    date: getLocalISODate()
  })

  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payAmount, setPayAmount] = useState<number>(0)
  const [payFrom, setPayFrom] = useState<string | null>(null)
  const [payTo, setPayTo] = useState<string | null>(null)
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState<SharedExpense | null>(null)
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false)

  // Load partnership details
  useEffect(() => {
    if (!groupId) return
    supabase
      .from('partnerships')
      .select('*')
      .eq('id', groupId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('partnership fetch error', error)
          setToast({ message: 'Sem permissão para ler parceria', variant: 'error' })
          return
        }
        setPartnership({
          id: data.id,
          name: data.name,
          createdAt: data.created_at,
          createdBy: data.created_by,
          role: 'member'
        })
      })
  }, [groupId])

  // Load members — set paid_by default only after members are loaded
  useEffect(() => {
    if (!groupId) return
    getPartnershipMembers(groupId)
      .then(loaded => {
        setMembers(loaded)
        setMembersLoaded(true)
        // Set default paid_by to current user once members are available
        if (user) {
          setForm(f => ({ ...f, paid_by: f.paid_by || user.id }))
        }
      })
      .catch(err => console.error('members fetch error', err))
  }, [groupId, user])

  // Subscribe to expenses
  useEffect(() => {
    if (!groupId) return
    const unsub = subscribeToSharedExpenses(groupId, setExpenses, (err) => {
      console.error('expenses listener error', err)
      setToast({ message: 'Sem permissão para ler despesas', variant: 'error' })
    })
    return () => { unsub() }
  }, [groupId])

  // Subscribe to debt settlements
  useEffect(() => {
    if (!groupId) return
    const unsub = subscribeToDebtSettlements(groupId, setPayments, (err) => {
      console.error('debt settlements listen error', err)
      setToast({ message: 'Sem permissão para ler quitações', variant: 'error' })
    })
    return () => { unsub() }
  }, [groupId])

  // Balance calculations
  const balancesInput = expenses.map(e => ({
    ...e,
    paidBy: e.paid_by,
    participants: members.map(m => m.uid)
  }))
  const balances = calculateBalances(balancesInput as any)
  const rawSettlements = calculateSettlements(balances)
  const adjustedSettlements = applyPaymentsToSettlements(
    rawSettlements,
    payments.map(p => ({ fromUserId: p.from_user_id, toUserId: p.to_user_id, amount: p.amount }))
  )

  function getMemberName(uid: string) {
    if (!uid) return 'Desconhecido'
    const m = members.find(m => m.uid === uid)
    // While members are loading, show shortened uid as fallback
    return m?.displayName ?? (membersLoaded ? uid.slice(0, 8) + '...' : '...')
  }

  function resetForm() {
    setForm({
      title: '',
      amount: 0,
      paid_by: user?.id ?? '',
      date: getLocalISODate()
    })
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!groupId) return

    if (!form.title || !form.amount || !form.paid_by) {
      setToast({ message: 'Preencha todos os campos', variant: 'warning' })
      return
    }

    try {
      const payload = {
        title: form.title,
        amount: Number(form.amount),
        paid_by: form.paid_by,
        date: form.date,
      }

      if (editingExpenseId) {
        await updateSharedExpense(editingExpenseId, payload)
        // Update local state immediately
        setExpenses(prev => prev.map(e =>
          e.id === editingExpenseId ? { ...e, ...payload } : e
        ))
        setToast({ message: 'Despesa atualizada', variant: 'success' })
      } else {
        const result = await createSharedExpense(groupId, payload)
        // Update local state immediately without waiting for realtime
        setExpenses(prev => [result, ...prev])
        setToast({ message: 'Despesa criada', variant: 'success' })
      }

      setOpenNew(false)
      setEditingExpenseId(null)
      resetForm()
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao salvar despesa', variant: 'error' })
    }
  }

  function handleEditClick(exp: SharedExpense) {
    setEditingExpenseId(exp.id)
    setForm({
      title: exp.title,
      amount: exp.amount,
      paid_by: exp.paid_by,
      date: exp.date.split('T')[0]
    })
    setOpenNew(true)
  }

  function handleDeleteClick(exp: SharedExpense) {
    setConfirmDeleteExpense(exp)
  }

  async function confirmDeleteExpense_handler() {
    if (!confirmDeleteExpense) return
    try {
      await deleteSharedExpense(confirmDeleteExpense.id)
      setExpenses(prev => prev.filter(e => e.id !== confirmDeleteExpense.id))
      setToast({ message: 'Despesa excluída', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao excluir despesa', variant: 'error' })
    } finally {
      setConfirmDeleteExpense(null)
    }
  }

  async function handleDeletePayment(paymentId: string) {
    try {
      await deleteDebtSettlement(paymentId)
      setPayments(prev => prev.filter(p => p.id !== paymentId))
      setToast({ message: 'Pagamento removido', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao remover pagamento', variant: 'error' })
    }
  }

  function getDateLabel(dateString: string) {
    const [year, month, day] = dateString.split('-').map(Number)
    const target = new Date(year, month - 1, day)
    const today = new Date()
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = (normalize(today).getTime() - normalize(target).getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 0) return 'Hoje'
    if (diff === 1) return 'Ontem'
    if (diff === 2) return 'Anteontem'
    return formatBRDate(dateString)
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to="/shared" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
            ← Voltar
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mt-1">
            {partnership?.name ?? 'Parceria'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Visão geral das despesas compartilhadas e saldos.
          </p>
        </div>

        <button
          onClick={() => { resetForm(); setOpenNew(true) }}
          className="
            h-12 w-full md:w-auto rounded-2xl
            bg-[var(--primary)] px-5
            text-sm font-medium text-white
            transition-all duration-200
            hover:bg-[var(--primary-hover)]
            hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
            active:scale-[0.99]
          "
        >
          + Nova despesa
        </button>
      </div>

      {/* Balances */}
      <section className="card p-5 md:p-6 flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Saldos</h3>

        {adjustedSettlements.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Nenhum saldo entre vocês</p>
        ) : (
          adjustedSettlements.map(s => (
            <div
              key={`${s.from}-${s.to}`}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{getMemberName(s.from)}</span>
                  {' deve '}
                  <span className="font-medium text-[var(--text-primary)]">{getMemberName(s.to)}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-semibold text-[var(--text-primary)]">
                    R$ {s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="flex md:justify-end">
                <button
                  onClick={() => {
                    setPayFrom(s.from)
                    setPayTo(s.to)
                    setPayAmount(s.amount)
                    setPayModalOpen(true)
                  }}
                  className="
                    h-9 w-full md:w-auto md:px-4 rounded-xl
                    border border-[rgba(96,136,121,0.25)]
                    bg-[rgba(96,136,121,0.08)]
                    text-xs font-medium text-[var(--primary)]
                    transition hover:bg-[rgba(96,136,121,0.14)]
                  "
                >
                  Quitar dívida
                </button>
              </div>
            </div>
          ))
        )}

        {payments.length > 0 && (
          <div className="flex justify-end mt-1">
            <button
              onClick={() => setPaymentsModalOpen(true)}
              className="text-xs font-medium text-[var(--primary)] hover:underline"
            >
              Ver histórico de pagamentos ({payments.length})
            </button>
          </div>
        )}
      </section>

      {/* Expenses list */}
      <section className="flex flex-col gap-8">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Despesas</h3>

        {expenses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="text-sm text-[var(--text-secondary)]">Nenhuma despesa registrada ainda.</p>
          </div>
        ) : (
          Object.entries(
            [...expenses]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .reduce((acc, exp) => {
                const key = exp.date.split('T')[0]
                if (!acc[key]) acc[key] = []
                acc[key].push(exp)
                return acc
              }, {} as Record<string, typeof expenses>)
          ).map(([date, dayExpenses]) => {
            const totalDay = dayExpenses.reduce((sum, e) => sum + e.amount, 0)

            return (
              <div key={date} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                    {getDateLabel(date)}
                  </h2>
                  <div className="mt-2 inline-flex items-center rounded-full bg-[rgba(96,136,121,0.12)] px-3 py-1 text-sm font-medium text-[var(--primary)]">
                    Total do dia: R$ {totalDay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-1 h-px bg-[var(--divider)]" />
                </div>

                {dayExpenses.map(exp => (
                  <SharedExpensePageCard
                    key={exp.id}
                    expense={exp as any}
                    paidByLabel={getMemberName(exp.paid_by)}
                    dateLabel={formatBRDate(exp.date)}
                    onEdit={() => handleEditClick(exp)}
                    onDelete={() => handleDeleteClick(exp)}
                  />
                ))}
              </div>
            )
          })
        )}
      </section>

      {/* New/Edit expense modal */}
      {openNew && (
        <Modal
          title={editingExpenseId ? 'Editar despesa' : 'Nova despesa'}
          onClose={() => { setOpenNew(false); setEditingExpenseId(null); resetForm() }}
        >
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Descrição</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Pizza, mercado..."
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Valor</label>
              <CurrencyInput
                value={form.amount}
                onChange={v => setForm(f => ({ ...f, amount: v }))}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Pago por</label>
              <div className="relative">
                <select
                  value={form.paid_by}
                  onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}
                  disabled={!membersLoaded}
                  className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 pr-10 text-sm text-[var(--text-primary)] outline-none appearance-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)] disabled:opacity-50"
                >
                  {!membersLoaded ? (
                    <option>Carregando...</option>
                  ) : (
                    members.map(m => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="appearance-none h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setOpenNew(false); setEditingExpenseId(null); resetForm() }}
                className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-11 rounded-2xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]"
              >
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Pay modal */}
      {payModalOpen && (
        <Modal title="Quitar dívida" onClose={() => setPayModalOpen(false)}>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-[var(--text-secondary)]">
              De: <span className="font-medium text-[var(--text-primary)]">{getMemberName(payFrom ?? '')}</span>
            </div>
            <div className="text-sm text-[var(--text-secondary)]">
              Para: <span className="font-medium text-[var(--text-primary)]">{getMemberName(payTo ?? '')}</span>
            </div>

            <CurrencyInput
              value={payAmount}
              onChange={setPayAmount}
              className="h-12 px-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-base"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPayModalOpen(false)}
                className="h-11 px-5 rounded-2xl border border-[var(--border)] text-sm text-[var(--text-primary)]"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!groupId || !payFrom || !payTo) return
                  try {
                    const result = await createDebtSettlement(groupId, {
                      from_user_id: payFrom,
                      to_user_id: payTo,
                      amount: payAmount,
                      date: getLocalISODate(),
                    })
                    setPayments(prev => [...prev, result])
                    setToast({ message: 'Pagamento registrado', variant: 'success' })
                    setPayModalOpen(false)
                  } catch (err) {
                    console.error(err)
                    setToast({ message: 'Erro ao registrar pagamento', variant: 'error' })
                  }
                }}
                className="h-11 px-5 rounded-2xl bg-[var(--primary)] text-white text-sm font-medium transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payments history modal */}
      {paymentsModalOpen && (
        <Modal title={`Histórico de pagamentos (${payments.length})`} onClose={() => setPaymentsModalOpen(false)}>
          <div className="flex flex-col gap-2">
            {[...payments]
              .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
              .map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                >
                  <div className="text-xs text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">{getMemberName(p.from_user_id)}</span>
                    {' pagou '}
                    <span className="font-medium text-[var(--text-primary)]">{getMemberName(p.to_user_id)}</span>
                    {' · R$ '}{p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    {p.date && (
                      <span className="ml-1 text-[var(--text-muted)]">
                        · {formatBRDate(p.date)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    className="text-xs text-[var(--danger)] hover:underline shrink-0"
                  >
                    Remover
                  </button>
                </div>
              ))}
          </div>
        </Modal>
      )}

      <ConfirmModal
        open={!!confirmDeleteExpense}
        title="Apagar despesa"
        message="Tem certeza que deseja apagar esta despesa? Se houver pagamentos registrados relacionados a ela, eles não serão removidos automaticamente — remova-os manualmente em Pagamentos Registrados se desejar. Pagamentos mantidos poderão abater dívidas futuras entre vocês."
        onCancel={() => setConfirmDeleteExpense(null)}
        onConfirm={confirmDeleteExpense_handler}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}