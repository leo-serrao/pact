import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import { SharedGroup, SharedExpense } from '../types/shared'
import { subscribeToSharedExpenses, createSharedExpense, deleteSharedExpense, updateSharedExpense } from '../services/sharedExpenses'
import { calculateBalances, calculateSettlements, applyPaymentsToSettlements } from '../services/sharedBalance'
import { subscribeToDebtSettlements, createDebtSettlement, deleteDebtSettlement } from '../services/debtSettlements'
import { DebtSettlement } from '../types/shared'
import { getUserProfile } from '../services/firestore'
import CurrencyInput from '../components/CurrencyInput'
import { getLocalISODate } from '../utils/date'
import SharedExpensePageCard from '../components/SharedExpensePageCard'
import { ChevronDown } from 'lucide-react'

export default function SharedGroupDetails() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState<SharedGroup | null>(null)
  const [expenses, setExpenses] = useState<SharedExpense[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [toast, setToast] = useState<{ message: string; variant?: string } | null>(null)
  const [openNew, setOpenNew] = useState(false)
  const [form, setForm] = useState({ title: '', amount: 0, paidBy: '', date: getLocalISODate() })
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    const d = doc(db, 'sharedGroups', groupId)
    const unsub = onSnapshot(d, snap => {
      if (!snap.exists()) { setGroup(null); return }
      const data = { id: snap.id, ...(snap.data() as any) } as SharedGroup
      setGroup(data)
    }, (err) => {
      console.error('group listener error', err)
      setToast({ message: 'Sem permissão para ler grupo', variant: 'error' })
    })
    return () => unsub()
  }, [groupId])

  useEffect(() => {
    if (!groupId) return
    const unsub = subscribeToSharedExpenses(groupId, (items) => {
      setExpenses(items)
      // fetch profiles for participants
      const uids = new Set<string>()
      items.forEach(i => i.participants.forEach(p => uids.add(p)))
      if (group) group.members.forEach(m => uids.add(m))
      uids.forEach(async uid => {
        if (profiles[uid]) return
        const p = await getUserProfile(uid)
        setProfiles(prev => ({ ...prev, [uid]: p }))
      })
    }, (err) => {
      console.error('expenses listener error', err)
      setToast({ message: 'Sem permissão para ler despesas', variant: 'error' })
    })
    return () => unsub()
  }, [groupId, group])

  useEffect(() => {
    // default paidBy to current user or first group member
    if (!group) return
    setForm(f => ({ ...f, paidBy: f.paidBy || (user?.uid ?? group.members[0] ?? '') }))
  }, [group, user])

  const balances = calculateBalances(expenses)
  const settlements = calculateSettlements(balances)
  const [payments, setPayments] = useState<DebtSettlement[]>([])
  const [paymentsPermissionDenied, setPaymentsPermissionDenied] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payAmount, setPayAmount] = useState<number>(0)
  const [payFrom, setPayFrom] = useState<string | null>(null)
  const [payTo, setPayTo] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId) return
    const unsub = subscribeToDebtSettlements(groupId, (items) => {
      setPayments(items)
      setPaymentsPermissionDenied(false)
    }, (err) => {
      console.error('debt settlements listen error', err)
      setPaymentsPermissionDenied(true)
      setToast({ message: 'Sem permissão para ler quitações. Verifique as regras do Firestore.', variant: 'error' })
    })
    return () => unsub()
  }, [groupId])

  const adjustedSettlements = applyPaymentsToSettlements(settlements, payments.map(p => ({ fromUserId: p.fromUserId, toUserId: p.toUserId, amount: p.amount })))

  async function handleDeletePayment(paymentId?: string) {
    if (!groupId || !paymentId) return
    try {
      await deleteDebtSettlement(groupId, paymentId)
      setToast({ message: 'Pagamento removido', variant: 'success' })
    } catch (err) {
      console.error('delete payment error', err)
      setToast({ message: 'Erro ao remover pagamento (verifique permissões)', variant: 'error' })
    }
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!groupId) return
    try {
      const participants = group?.members || []
      if (!form.title || !form.amount || !form.paidBy || participants.length === 0) {
        setToast({ message: 'Preencha todos os campos', variant: 'warning' })
        return
      }
      // ensure date is full ISO timestamp (set to midnight local)
      const isoDate = form.date ? `${form.date}T00:00:00` : new Date().toISOString()
      const payload: Omit<SharedExpense, 'id' | 'createdAt'> = {
        title: form.title,
        amount: Number(form.amount),
        paidBy: form.paidBy,
        participants,
        date: isoDate
      }
      if (editingExpenseId) {
        await updateSharedExpense(groupId, editingExpenseId, payload)
        setToast({ message: 'Despesa atualizada', variant: 'success' })
      } else {
        await createSharedExpense(groupId, payload)
        setToast({ message: 'Despesa criada', variant: 'success' })
      }
      setOpenNew(false)
      setForm({ title: '', amount: 0, paidBy: user?.uid ?? '', date: getLocalISODate() })
      setEditingExpenseId(null)
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao criar despesa', variant: 'error' })
    }
  }

  function handleEditClick(exp: SharedExpense) {
    setEditingExpenseId(exp.id ?? null)
    setForm({ title: exp.title, amount: exp.amount, paidBy: exp.paidBy, date: exp.date.split('T')[0] })
    setOpenNew(true)
  }

  async function handleDeleteClick(exp: SharedExpense) {
    if (!groupId || !exp.id) return
    try {
      await deleteSharedExpense(groupId, exp.id)
      setToast({ message: 'Despesa excluída', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao excluir despesa', variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            to="/shared"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
          >
            ← Voltar
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] mt-1">
            {group?.name ?? 'Grupo'}
          </h1>

          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Visão geral das despesas compartilhadas e saldos do grupo.
          </p>
        </div>

        <button
          onClick={() => setOpenNew(true)}
          className="
            h-12 w-full md:w-auto
            rounded-2xl
            bg-[var(--primary)]
            px-5
            text-sm font-medium text-white
            transition-all duration-200
            hover:bg-[var(--primaryHover)]
            hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
            active:scale-[0.99]
          "
        >
          + Nova despesa
        </button>
      </div>

      {/* BALANCES */}
      <section className="card p-5 md:p-6 flex flex-col">

        {/* HEADER DO CARD */}
        <div className="mb-0">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Saldos
          </h3>
        </div>

        {/* CONTENT */}
        <div className="flex flex-col gap-4">
          {settlements.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Nenhum saldo entre vocês
            </p>
          ) : (
            settlements.map(s => {
              const remaining =
                adjustedSettlements.find(a => a.from === s.from && a.to === s.to)
                  ?.amount ?? 0

              return (
                <div
                  key={`${s.from}-${s.to}`}
                  className="
                    flex flex-col md:flex-row md:items-center md:justify-between
                    gap-3 py-3 border-b border-[var(--divider)]
                    last:border-0
                  "
                >
                  {/* TEXTO */}
                  <div className="text-sm text-[var(--text-secondary)] leading-5">
                    <span className="text-[var(--text-primary)] font-medium">
                      {profiles[s.from]?.displayName ?? profiles[s.from]?.email ?? s.from}
                    </span>

                    {' deve '}

                    <span className="text-[var(--text-primary)] font-medium">
                      R$ {s.amount.toFixed(2)}
                    </span>

                    {' para '}

                    <span className="text-[var(--text-primary)] font-medium">
                      {profiles[s.to]?.displayName ?? profiles[s.to]?.email ?? s.to}
                    </span>

                    {remaining === 0 && (
                      <span className="ml-2 text-xs text-[var(--success)] font-medium">
                        Quitado
                      </span>
                    )}

                    {remaining > 0 && (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">
                        Restante R$ {remaining.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* AÇÃO */}
                  <div className="flex justify-end md:justify-end">
                    <button
                      disabled={paymentsPermissionDenied || remaining <= 0}
                      onClick={() => {
                        setPayFrom(s.from)
                        setPayTo(s.to)
                        setPayAmount(remaining > 0 ? remaining : s.amount)
                        setPayModalOpen(true)
                      }}
                      className={`
                        h-10 w-full md:w-auto
                        px-4 rounded-xl text-sm font-medium
                        border transition
                        ${
                          paymentsPermissionDenied || remaining <= 0
                            ? 'opacity-40 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)]'
                            : 'border-[var(--border)] text-[var(--primary)] hover:bg-[var(--surface-secondary)]'
                        }
                      `}
                    >
                      Quitar dívida
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* PAYMENTS */}
          <div className="pt-4">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Pagamentos registrados
            </h4>

            {payments.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Nenhum pagamento registrado
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {payments.map(p => (
                  <div
                    key={p.id}
                    className="
                      flex items-center justify-between
                      rounded-2xl border border-[var(--border)]
                      bg-[var(--surface)]
                      px-4 py-3
                    "
                  >
                    <div className="text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--text-primary)] font-medium">
                        {profiles[p.fromUserId]?.displayName ?? p.fromUserId}
                      </span>

                      {' → '}

                      <span className="text-[var(--text-primary)] font-medium">
                        {profiles[p.toUserId]?.displayName ?? p.toUserId}
                      </span>

                      {': R$ '}

                      <span className="text-[var(--text-primary)] font-semibold">
                        {p.amount.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="
                        h-8 px-3 rounded-xl
                        text-sm font-medium text-red-500
                        border border-[var(--border)]
                        hover:bg-red-50
                        transition
                      "
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* EXPENSES */}
      <section className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Despesas
        </h3>

        {expenses.length === 0 ? (
          <div className="card p-6 text-sm text-[var(--text-secondary)]">
            Nenhuma despesa registrada
          </div>
        ) : (
          expenses.map(ex => (
            <SharedExpensePageCard
              key={ex.id}
              expense={ex}
              paidByLabel={
                profiles[ex.paidBy]?.displayName ??
                profiles[ex.paidBy]?.email ??
                ex.paidBy
              }
              dateLabel={new Date(ex.date).toLocaleDateString()}
              onEdit={() => handleEditClick(ex)}
              onDelete={() => handleDeleteClick(ex)}
            />
          ))
        )}
      </section>

      {/* MODALS */}
      {openNew && (
        <Modal title="Nova despesa" onClose={() => setOpenNew(false)}>
          <form onSubmit={handleCreate} className="space-y-5">

            {/* TÍTULO */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Título
              </label>

              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Pizza, mercado..."
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

            {/* VALOR */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Valor
              </label>

              <CurrencyInput
                value={form.amount}
                onChange={v => setForm(f => ({ ...f, amount: v }))}
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

            {/* QUEM PAGOU */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Pago por
              </label>

              <div className="relative">
                <select
                  value={form.paidBy}
                  onChange={e => setForm(f => ({ ...f, paidBy: e.target.value }))}
                  className="
                    h-12 w-full rounded-2xl
                    border border-[var(--border)]
                    bg-[var(--surface)]
                    px-4 pr-10
                    text-sm text-[var(--text-primary)]
                    outline-none
                    appearance-none
                    transition
                    focus:border-[var(--primary)]
                    focus:ring-4
                    focus:ring-[rgba(96,136,121,0.10)]
                  "
                >
                  {group?.members?.map(uid => (
                    <option key={uid} value={uid}>
                      {profiles[uid]?.displayName ?? profiles[uid]?.email ?? uid}
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

            {/* DATA */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Data
              </label>

              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="
                  appearance-none
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

            {/* AÇÕES */}
            <div className="flex justify-end gap-3 pt-2">

              <button
                type="button"
                onClick={() => setOpenNew(false)}
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

      {payModalOpen && (
        <Modal title="Quitar dívida" onClose={() => setPayModalOpen(false)}>
          <div className="flex flex-col gap-4">

            <div className="text-sm text-[var(--text-secondary)]">
              De: {profiles[payFrom ?? '']?.displayName ?? payFrom}
            </div>

            <div className="text-sm text-[var(--text-secondary)]">
              Para: {profiles[payTo ?? '']?.displayName ?? payTo}
            </div>

            <CurrencyInput
              value={payAmount}
              onChange={setPayAmount}
              className="h-12 px-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-base"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPayModalOpen(false)}
                className="h-11 px-4 rounded-2xl border border-[var(--border)] text-sm"
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (!groupId || !payFrom || !payTo) return
                  try {
                    await createDebtSettlement(groupId, {
                      fromUserId: payFrom,
                      toUserId: payTo,
                      amount: payAmount,
                      groupId
                    })

                    setToast({ message: 'Pagamento registrado', variant: 'success' })
                    setPayModalOpen(false)
                  } catch (err) {
                    console.error(err)
                    setToast({ message: 'Erro ao registrar pagamento', variant: 'error' })
                  }
                }}
                className="
                  h-11 px-5 rounded-2xl
                  bg-[var(--primary)]
                  text-white text-sm font-medium
                  hover:bg-[var(--primaryHover)]
                  transition
                "
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
