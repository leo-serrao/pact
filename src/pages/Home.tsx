import React, { useMemo, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { addVariableExpenseToUser } from '../services/expenses'
import CurrencyInput from '../components/CurrencyInput'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { useFinanceStore } from '../store/useFinanceStore'
import { calculate50_30_20, computeSmartDailyProjection, currency, getUnifiedVariableExpenses } from '../utils/finance'
import {
  Chart,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Tooltip, Filler,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler)
import { getLocalISODate, getLocalISODateFromDate } from '../utils/date'
import { subscribeToUserSharedAdjustments } from '../services/sharedUserAdjustments'
import { subscribeToUserDebtSettlements } from '../services/userDebtSettlements'

const CHART_DAYS_OPTIONS = [7, 14, 30, 90] as const
type ChartDays = typeof CHART_DAYS_OPTIONS[number]

export default function Home() {
  const { profile, fixedExpenses, variableExpenses, addVariableExpense, savingBoxes } = useFinanceStore()
  const navigate = useNavigate()
  const { user } = useAuth()

  const netSalary = profile?.netSalary ?? 0
  const payDay = profile?.payDay ?? 1
  const savingsPercent = profile?.savingsPercent ?? 0.2

  const allocations = useMemo(
    () => calculate50_30_20(netSalary, fixedExpenses, savingsPercent),
    [netSalary, fixedExpenses, savingsPercent]
  )

  const [sharedAdjustments, setSharedAdjustments] = useState<{
    id: string
    date: string
    amount: number
    partnership_id?: string
    expenseId?: string
    isPayer?: boolean
  }[]>([])

  const [sharedPayments, setSharedPayments] = useState<{
    id: string
    from_user_id: string
    to_user_id: string
    amount: number
    created_at: string
  }[]>([])

  const mergedVariableExpenses = useMemo(() => {
    return getUnifiedVariableExpenses(variableExpenses, sharedAdjustments)
  }, [variableExpenses, sharedAdjustments])

  const proj = useMemo(
    () => computeSmartDailyProjection(netSalary, fixedExpenses, mergedVariableExpenses, payDay, savingsPercent),
    [netSalary, fixedExpenses, mergedVariableExpenses, payDay, savingsPercent]
  )

  const sharedSummary = useMemo(() => {
    if (!sharedAdjustments || sharedAdjustments.length === 0) {
      return { total: 0, youOwe: 0, owedToYou: 0 }
    }

    const today = new Date()
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    const filtered = sharedAdjustments.filter(a => a.date.startsWith(monthKey))
    const total = filtered.reduce((s, a) => s + Math.abs(a.amount), 0)
    const youOweGross = filtered.filter(a => !a.isPayer).reduce((s, a) => s + Math.abs(a.amount), 0)
    const owedToYouGross = filtered.filter(a => a.isPayer).reduce((s, a) => s + Math.abs(a.amount), 0)

    const paymentsThisMonth = (sharedPayments || []).filter(
      p => p.created_at && p.created_at.startsWith(monthKey)
    )
    const paidByMe = paymentsThisMonth
      .filter(p => p.from_user_id === user?.id)
      .reduce((s, p) => s + (p.amount || 0), 0)
    const receivedByMe = paymentsThisMonth
      .filter(p => p.to_user_id === user?.id)
      .reduce((s, p) => s + (p.amount || 0), 0)

    const youOweAfterPayments = Math.max(0, youOweGross - paidByMe)
    const owedToYouAfterPayments = Math.max(0, owedToYouGross - receivedByMe)

    const net = Math.round((youOweAfterPayments - owedToYouAfterPayments) * 100) / 100
    const youOwe = net > 0 ? net : 0
    const owedToYou = net < 0 ? -net : 0

    return {
      total: Math.round(total * 100) / 100,
      youOwe,
      owedToYou,
      youOweGross: Math.round(youOweAfterPayments * 100) / 100,
      owedToYouGross: Math.round(owedToYouAfterPayments * 100) / 100,
    }
  }, [sharedAdjustments, sharedPayments, user])

  // Chart: variable expenses per day for the selected window
  const [chartDays, setChartDays] = useState<ChartDays>(14)

  const chartData = useMemo(() => {
    const today = new Date()
    const map = new Map<string, number>()

    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      map.set(getLocalISODateFromDate(d), 0)
    }

    const allExpenses = [
      ...variableExpenses,
      ...sharedAdjustments.map(a => ({ amount: a.amount, date: a.date })),
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
  }, [variableExpenses, sharedAdjustments, chartDays])

  // Chart.js line chart
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const style = getComputedStyle(document.documentElement)
    const primary  = style.getPropertyValue('--primary').trim()  || '#608879'
    const surface  = style.getPropertyValue('--surface').trim()  || '#FFFFFF'
    const border   = style.getPropertyValue('--border').trim()   || '#D9DDD8'
    const textSec  = style.getPropertyValue('--text-secondary').trim() || '#5F6361'
    const textPri  = style.getPropertyValue('--text-primary').trim()   || '#1A1C1B'

    chartInstanceRef.current?.destroy()
    chartInstanceRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: chartData.map(d => d.date),
        datasets: [{
          data: chartData.map(d => d.amount),
          borderColor: primary,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: primary,
          tension: 0.4,
          fill: true,
          backgroundColor: (ctx: any) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
            gradient.addColorStop(0, primary + '22')
            gradient.addColorStop(1, primary + '00')
            return gradient
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: surface,
            titleColor: textSec,
            bodyColor: textPri,
            borderColor: border,
            borderWidth: 1,
            cornerRadius: 10,
            padding: 10,
            callbacks: {
              label: ctx => 'R$ ' + (ctx.parsed.y as number).toLocaleString('pt-BR'),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: textSec,
              font: { size: 10 },
              autoSkip: true,
              maxTicksLimit: chartDays <= 7 ? 7 : chartDays <= 14 ? 5 : 8,
              maxRotation: 0,
            },
          },
          y: {
            grid: { color: border, lineWidth: 0.5 },
            border: { display: false },
            beginAtZero: true,
            ticks: {
              color: textSec,
              font: { size: 10 },
              callback: (v: any) => {
                const n = Number(v)
                return n >= 1000 ? 'R$' + Math.round(n / 100) / 10 + 'k' : 'R$' + n
              },
            },
          },
        },
      },
    })

    return () => { chartInstanceRef.current?.destroy() }
  }, [chartData, chartDays])

  // Highlight today's card when a new expense is added
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
    if (!user) return
    const unsub1 = subscribeToUserSharedAdjustments(
      user.id,
      adj => setSharedAdjustments(adj),
      err => console.error('shared adjustments error', err)
    )
    const unsub2 = subscribeToUserDebtSettlements(
      user.id,
      items => setSharedPayments(items),
      err => console.error('shared payments error', err)
    )
    return () => { unsub1(); unsub2() }
  }, [user])

  // Quick-add modal
  const [openAdd, setOpenAdd] = useState(false)
  const todayISO = getLocalISODate()
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState<number>(0)
  const [newDate, setNewDate] = useState<string>(todayISO)
  const [newCategory, setNewCategory] = useState('outros')
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'warning' | 'info' } | null>(null)

  async function handleQuickAdd(e?: React.FormEvent) {
    e?.preventDefault()
    const item = {
      id: crypto.randomUUID(),
      title: newTitle,
      amount: newAmount,
      category: newCategory,
      date: newDate,
    }
    try {
      if (user) await addVariableExpenseToUser(user.id, item)
      addVariableExpense(item as any)
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

  // Progress bar: % of available-for-variables already spent
  const spentPercent = allocations.availableForVariables > 0
    ? Math.min(100, Math.round((proj.totalVariableSpent / allocations.availableForVariables) * 100))
    : 0

  // Daily budget progress: % of day already "consumed" relative to daily allowance
  const dailyAllowance = proj.todayBudget + (proj.totalVariableSpent / Math.max(proj.daysRemaining, 1))
  const dailySpentPercent = dailyAllowance > 0
    ? Math.min(100, Math.round((todaySpent / dailyAllowance) * 100))
    : 0

  const now = new Date()
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const monthLabelCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {monthLabelCapitalized}
          </p>
        </div>
        <button
          onClick={() => setOpenAdd(true)}
          className="h-10 rounded-2xl bg-[var(--primary)] px-4 text-sm font-medium text-white transition-all duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)] active:scale-[0.99]"
        >
          + Novo gasto
        </button>
      </div>

      {/* Hero row: 3 large cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

        {/* Daily budget — featured */}
        <div className="rounded-3xl border-2 border-[var(--primary)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            Disponível hoje
          </div>
          <div className={`mt-2 text-3xl font-semibold tracking-tight ${proj.todayBudget < 0 ? 'text-red-500' : 'text-[var(--primary)]'}`}>
            {currency.format(proj.todayBudget)}
          </div>
          <div className={`mt-2 text-xs ${
            proj.startsNewCycleTomorrow
              ? 'text-[var(--text-secondary)]'
              : proj.tomorrowBudget > proj.todayBudget
              ? 'text-emerald-500'
              : proj.tomorrowBudget < proj.todayBudget
              ? 'text-red-500'
              : 'text-[var(--text-secondary)]'
          }`}>
            Amanhã: {currency.format(proj.tomorrowBudget)}
            <span className="ml-1 opacity-80">
              {proj.startsNewCycleTomorrow
                ? '· novo ciclo'
                : proj.spentLessThanPlanned
                ? '· você gastou menos hoje'
                : '· você gastou mais hoje'}
            </span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${dailySpentPercent}%` }}
            />
          </div>
        </div>

        {/* Total remaining */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            Total restante no mês
          </div>
          <div className={`mt-2 text-3xl font-semibold tracking-tight ${proj.totalRemaining < 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
            {currency.format(proj.totalRemaining)}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            {proj.daysRemaining} dias até o pagamento
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--text-secondary)] opacity-40 transition-all duration-500"
              style={{ width: `${spentPercent}%` }}
            />
          </div>
        </div>

        {/* Partnership summary */}
        <div
          onClick={() => navigate('/shared')}
          className="cursor-pointer rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] transition-all duration-200 hover:border-[var(--primary)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
        >
          <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            Parceria · o que você deve
          </div>
          <div className={`mt-2 text-3xl font-semibold tracking-tight ${sharedSummary.youOwe > 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
            {currency.format(sharedSummary.youOwe)}
          </div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            {sharedSummary.owedToYou > 0
              ? <span className="text-emerald-500">Devem para você: {currency.format(sharedSummary.owedToYou)}</span>
              : 'Contas em dia'}
          </div>
        </div>

      </div>

      {/* Mid row: 4 mini cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        <div className="rounded-2xl bg-[var(--surface-secondary)] p-4">
          <div className="text-xs text-[var(--text-secondary)]">Gastos fixos</div>
          <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {currency.format(allocations.totalFixed)}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--surface-secondary)] p-4">
          <div className="text-xs text-[var(--text-secondary)]">Gastos variáveis</div>
          <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {currency.format(proj.totalVariableSpent)}
          </div>
        </div>

        <div
          onClick={() => navigate('/variable')}
          className={`cursor-pointer rounded-2xl bg-[var(--surface-secondary)] p-4 transition-all duration-200 hover:ring-1 hover:ring-[var(--primary)] ${highlight ? 'today-highlight' : ''}`}
        >
          <div className="text-xs text-[var(--text-secondary)]">Gasto hoje</div>
          <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {currency.format(todaySpent)}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--surface-secondary)] p-4">
          <div className="text-xs text-[var(--text-secondary)]">Reserva recomendada</div>
          <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            {currency.format(allocations.savings)}
          </div>
        </div>

      </div>

      {/* Bottom row: chart + financial summary */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">

        {/* Line chart */}
        <div className="xl:col-span-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Gastos variáveis</h3>
            <div className="flex gap-1">
              {CHART_DAYS_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    chartDays === d
                      ? 'bg-[var(--primary)] text-white'
                      : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4" style={{ position: 'relative', width: '100%', height: '200px' }}>
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Gráfico de linha com gastos variáveis"
            >
              Gastos variáveis no período.
            </canvas>
          </div>
        </div>

        {/* Financial summary */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Resumo financeiro</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Salário líquido</span>
              <span className="font-medium text-[var(--text-primary)]">{currency.format(netSalary)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Reserva</span>
              <span className="font-medium text-red-500">− {currency.format(allocations.savings)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Gastos fixos</span>
              <span className="font-medium text-red-500">− {currency.format(allocations.totalFixed)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Gastos variáveis</span>
              <span className="font-medium text-red-500">− {currency.format(proj.totalVariableSpent)}</span>
            </div>
            <div className="h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-[var(--text-secondary)]">Disponível para gastar</span>
              </div>
              <span className={`text-xl font-semibold tracking-tight ${proj.totalRemaining < 0 ? 'text-red-500' : 'text-[var(--primary)]'}`}>
                {currency.format(proj.totalRemaining)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Quick-add modal */}
      {openAdd && (
        <Modal title="Adicionar gasto variável" onClose={() => setOpenAdd(false)}>
          <form onSubmit={handleQuickAdd} className="space-y-4 overflow-x-hidden w-full min-w-0">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Título</label>
              <input
                placeholder="Ex: Mercado"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Valor</label>
              <CurrencyInput
                value={newAmount}
                onChange={setNewAmount}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Data</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="appearance-none h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Categoria</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
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
                className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-11 rounded-2xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-[var(--primary-hover)]"
              >
                Adicionar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Toast message={toast ?? undefined} onClose={() => setToast(null)} />
    </div>
  )
}