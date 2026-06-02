import React, { useMemo, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { addVariableExpenseToUser } from '../services/expenses'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useFinanceStore } from '../store/useFinanceStore'
import { format } from 'date-fns'
import { calculate50_30_20, computeSmartDailyProjection, currency, getUnifiedVariableExpenses} from '../utils/finance'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getLocalISODate, getLocalISODateFromDate } from '../utils/date'
import { subscribeToUserSharedAdjustments } from '../services/sharedUserAdjustments'
import { subscribeToUserDebtSettlements } from '../services/userDebtSettlements'

export default function Home() {
  const { profile, fixedExpenses, variableExpenses, addVariableExpense, savingBoxes } = useFinanceStore()
  const navigate = useNavigate()
  const { user } = useAuth()

  // debug logs removed

  const netSalary = profile?.netSalary ?? 0
  const payDay = profile?.payDay ?? 1

  const savingsPercent = profile?.savingsPercent ?? 0.2
  const allocations = useMemo(() => calculate50_30_20(netSalary, fixedExpenses, savingsPercent), [netSalary, fixedExpenses, savingsPercent])
  const [sharedAdjustments, setSharedAdjustments] = useState<{ id: string; date: string; amount: number; groupId?: string; expenseId?: string; isPayer?: boolean }[]>([])
  const [sharedPayments, setSharedPayments] = useState<any[]>([])

  const mergedVariableExpenses = useMemo(() => {
    return getUnifiedVariableExpenses(variableExpenses, sharedAdjustments)
  }, [variableExpenses, sharedAdjustments])

  const proj = useMemo(() => computeSmartDailyProjection(netSalary, fixedExpenses, mergedVariableExpenses, payDay, savingsPercent), [netSalary, fixedExpenses, mergedVariableExpenses, payDay, savingsPercent])

  // Shared summary for current month
  const sharedSummary = useMemo(() => {
    if (!sharedAdjustments || sharedAdjustments.length === 0) return { total: 0, youOwe: 0, owedToYou: 0 }
    const today = new Date()
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const filtered = sharedAdjustments.filter(a => a.date.startsWith(monthKey))
    const total = filtered.reduce((s, a) => s + Math.abs(a.amount), 0)
    const youOweGross = filtered.filter(a => !a.isPayer).reduce((s, a) => s + Math.abs(a.amount), 0)
    const owedToYouGross = filtered.filter(a => a.isPayer).reduce((s, a) => s + Math.abs(a.amount), 0)
    // consider payments recorded this month
    const paymentsThisMonth = (sharedPayments || []).filter(p => p.createdAt && p.createdAt.startsWith(monthKey))
    const paidByMe = paymentsThisMonth.filter(p => p.fromUserId === user?.uid).reduce((s, p) => s + (p.amount || 0), 0)
    const receivedByMe = paymentsThisMonth.filter(p => p.toUserId === user?.uid).reduce((s, p) => s + (p.amount || 0), 0)
    const youOweGrossAfterPayments = Math.max(0, youOweGross - paidByMe)
    const owedToYouGrossAfterPayments = Math.max(0, owedToYouGross - receivedByMe)
    // compute net amounts after payments
    const net = Math.round((youOweGrossAfterPayments - owedToYouGrossAfterPayments) * 100) / 100
    const youOwe = net > 0 ? net : 0
    const owedToYou = net < 0 ? -net : 0
    return { total: Math.round(total * 100) / 100, youOwe, owedToYou, youOweGross: Math.round(youOweGrossAfterPayments*100)/100, owedToYouGross: Math.round(owedToYouGrossAfterPayments*100)/100 }
  }, [sharedAdjustments, sharedPayments, user])

  // prepare chart data: sum variable expenses per day for last 14 days
  const chartData = useMemo(() => {
    const days = 14
    const today = new Date()
    const map = new Map<string, number>()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = getLocalISODateFromDate(d)
      map.set(key, 0)
    }

    const allExpenses = [
      ...variableExpenses,
      ...sharedAdjustments.map(a => ({
        amount: a.amount,
        date: a.date
      }))
    ]

    allExpenses.forEach(v => {
      const key = v.date.split('T')[0]
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + v.amount)
      }
    })

    return Array.from(map.entries()).map(([date, amount]) => {
      const [, month, day] = date.split('-')
      return { date: `${day}/${month}`, amount }
    })
  }, [mergedVariableExpenses])

  // highlight today's card when a new expense for today is added
  const [highlight, setHighlight] = useState(false)
  const prevTodaySpent = useRef(0)
  const todayKey = getLocalISODate()
  const todaySpent = mergedVariableExpenses
    .filter(v => v.date.split('T')[0] === todayKey)
    .reduce((s, v) => s + v.amount, 0)

  useEffect(() => {
    if (todaySpent > prevTodaySpent.current) {
      setHighlight(true)
      const t = setTimeout(() => setHighlight(false), 1200)
      return () => clearTimeout(t)
    }
    prevTodaySpent.current = todaySpent
  }, [todaySpent])

  useEffect(() => {
    let unsub1: (()=>void) | null = null
    let unsub2: (()=>void) | null = null
    if (user) {
      unsub1 = subscribeToUserSharedAdjustments(user.uid, (adj) => {
        setSharedAdjustments(adj)
      }, (err) => console.error('shared adjustments error', err))
      unsub2 = subscribeToUserDebtSettlements(user.uid, (items) => {
        setSharedPayments(items)
      }, (err) => console.error('shared payments error', err))
    }
    return () => { if (unsub1) unsub1(); if (unsub2) unsub2() }
  }, [user])

  // modal for quick add
  const [openAdd, setOpenAdd] = useState(false)
  const todayISO = getLocalISODate()
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState<number>(0)
  const [newDate, setNewDate] = useState<string>(todayISO)
  const [newCategory, setNewCategory] = useState('outros')
  const [toast, setToast] = useState<{ message: string; variant?: 'success'|'error'|'warning'|'info' } | null>(null)

  async function handleQuickAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const item = { id: Date.now().toString(), title: newTitle, amount: newAmount, category: newCategory, date: newDate }
    addVariableExpense(item as any)
    try {
      if (user) await addVariableExpenseToUser(user.uid, item)
      setToast({ message: 'Gasto adicionado', variant: 'success' })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao salvar gasto', variant: 'error' })
    }
    setNewTitle('')
    setNewAmount(0)
    setNewDate(todayISO)
    setNewCategory('outros')
    setOpenAdd(false)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Visão geral das suas finanças.
          </p>
        </div>

        <button
          onClick={() => setOpenAdd(true)}
          className="
            h-12 w-full sm:w-auto
            rounded-2xl
            bg-[var(--primary)]
            px-5
            text-sm font-medium text-white
            transition-all duration-200
            hover:bg-[var(--primary-hover)]
            hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
            active:scale-[0.99]
          "
        >
          + Novo gasto
        </button>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        
        {/* Card 1 */}
        <div
          className="
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-6
            shadow-[var(--shadow-soft)]
          "
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Reserva recomendada
          </div>

          <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {currency.format(allocations.savings)}
          </div>

          {savingBoxes && savingBoxes.length > 0 && (
            <button
              onClick={() => navigate('/boxes')}
              aria-label="Ver caixinhas"
              className="
                mt-5 flex items-center gap-2
                text-sm text-[var(--text-secondary)]
                transition-colors
                hover:text-[var(--primary)]
              "
            >
              <span className="text-left">
                Total em Caixinhas:  {currency.format(savingBoxes.reduce((s, b) => s + b.amount, 0))}
              </span>

              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 4.21a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06L10.44 10 7.21 6.27a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Card 2 */}
        <div
          onClick={() => navigate('/shared')}
          className="
            cursor-pointer
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-6
            shadow-[var(--shadow-soft)]
            transition-all duration-200
            hover:border-[var(--primary)]
            hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]
          "
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Gastos compartilhados (mês)
          </div>

          <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {currency.format(sharedSummary.total)}
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-sm text-[var(--text-secondary)]">
              Você deve: {currency.format(sharedSummary.youOwe)}
            </div>

            <div className="text-sm text-[var(--text-secondary)]">
              Devem para você: {currency.format(sharedSummary.owedToYou)}
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div
          className="
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-6
            shadow-[var(--shadow-soft)]
          "
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Gasto diário disponível
          </div>

          <div
            className={`mt-3 text-3xl font-semibold tracking-tight ${
              proj.todayBudget < 0
                ? 'text-red-500'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {currency.format(proj.todayBudget)}
          </div>

          <div
            className={`mt-5 text-sm ${
              proj.startsNewCycleTomorrow
                ? 'text-[var(--text-secondary)]'
                : proj.tomorrowBudget > proj.todayBudget
                ? 'text-emerald-500'
                : proj.tomorrowBudget < proj.todayBudget
                ? 'text-red-500'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Amanhã: {currency.format(proj.tomorrowBudget)}

            <span className="ml-2 text-xs opacity-80">
              {proj.startsNewCycleTomorrow
                ? 'novo ciclo amanhã'
                : proj.spentLessThanPlanned
                ? '↑ você gastou menos hoje'
                : '↓ hoje você gastou mais que o previsto'}
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div
          onClick={() => navigate('/variable')}
          className={`
            cursor-pointer
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-6
            shadow-[var(--shadow-soft)]
            transition-all duration-200
            hover:border-[var(--primary)]
            hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]
            ${highlight ? 'today-highlight' : ''}
          `}
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Gasto feito hoje
          </div>

          <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {currency.format(todaySpent)}
          </div>
        </div>

        {/* Card 5 */}
        <div
          className="
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-6
            shadow-[var(--shadow-soft)]
          "
        >
          <div className="text-sm text-[var(--text-secondary)]">
            Dias até pagamento
          </div>

          <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {proj.daysRemaining}
          </div>
        </div>
      </div>

      {/* Modal */}
      {openAdd && (
        <Modal
          title="Adicionar gasto variável"
          onClose={() => setOpenAdd(false)}
        >
          <form
            onSubmit={(e) => handleQuickAdd(e)}
            className="space-y-4 overflow-x-hidden w-full min-w-0"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Título
              </label>

              <input
                placeholder="Ex: Mercado"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-base
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
                Valor
              </label>

              <CurrencyInput
                value={newAmount}
                onChange={setNewAmount}
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-base
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
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="
                  appearance-none
                  h-12 w-full
                  rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-3
                  text-sm
                "
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Categoria
              </label>

              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-sm
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
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpenAdd(false)}
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
                  hover:bg-[var(--primaryHover)]
                  hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
                "
              >
                Adicionar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bottom section */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        
        {/* Resumo */}
        <div
          className="
            order-1 xl:order-2
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-6
            shadow-[var(--shadow-soft)]
          "
        >
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            Resumo financeiro
          </p>

          <div className="mt-5 space-y-4">

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                Gastos fixos
              </span>

              <span className="font-medium text-[var(--text-primary)]">
                {currency.format(
                  allocations.totalFixed
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                Disponível para variáveis
              </span>

              <span className="font-medium text-[var(--text-primary)]">
                {currency.format(
                  allocations.availableForVariables
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">
                Gastos variáveis totais
              </span>

              <span className="font-medium text-[var(--text-primary)]">
                {currency.format(
                  proj.totalVariableSpent
                )}
              </span>
            </div>

            <div className="h-px bg-[var(--divider)]" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                Total restante
              </span>

              <span
                className={`text-2xl font-semibold tracking-tight ${
                  proj.totalRemaining < 0
                    ? 'text-red-500'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {currency.format(
                  proj.totalRemaining
                )}
              </span>
            </div>

          </div>
        </div>

        {/* Chart */}
        <div
          className="
            order-2 xl:order-1
            xl:col-span-2
            rounded-3xl
            border border-[var(--border)]
            bg-[var(--surface)]
            p-6
            shadow-[var(--shadow-soft)]
          "
        >
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Gastos (14 dias)
          </h3>

          <div className="mt-6 h-[240px] w-full">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8B8B8B', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: '#8B8B8B', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <Toast
        message={toast ?? undefined}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
