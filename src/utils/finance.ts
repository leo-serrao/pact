import { differenceInCalendarDays, addMonths, subMonths, lastDayOfMonth } from 'date-fns'
import { FixedExpense, VariableExpense } from '../types'
import { getLocalISODateFromDate } from './date'

export const currency = new Intl.NumberFormat(
  'pt-BR',
  {
    style: 'currency',
    currency: 'BRL'
  }
)

export type Allocations = {
  needs: number
  wants: number
  savings: number
  totalFixed: number
  availableForVariables: number
}

export function calculate50_30_20(netSalary: number, fixedExpenses: FixedExpense[] = [], savingsPercent: number = 0.2): Allocations {
  const baseSavings = netSalary * savingsPercent
  // keep needs:wants ratio at 50:30 relative weights
  const needsWeight = 0.5
  const wantsWeight = 0.3
  const totalWeight = needsWeight + wantsWeight
  const remaining = netSalary - baseSavings
  const baseNeeds = remaining * (needsWeight / totalWeight)
  const baseWants = remaining * (wantsWeight / totalWeight)
  

  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0)

  let needs = baseNeeds
  let wants = baseWants
  let savings = baseSavings

  // fixed expenses consume the needs bucket first
  const remainingNeeds = needs - totalFixed
  if (remainingNeeds >= 0) {
    needs = Math.max(0, remainingNeeds)
  } else {
    // fixed > needs: consume wants then savings proportionally
    let deficit = -remainingNeeds
    wants = Math.max(0, wants - deficit)
    if (wants === 0 && deficit > baseWants) {
      deficit = deficit - baseWants
      savings = Math.max(0, savings - deficit)
    }
    needs = 0
  }

  const availableForVariables = Math.max(0, needs + wants)

  return {
    needs,
    wants,
    savings,
    totalFixed,
    availableForVariables
  }
}

export function getNextPayDate(from: Date, payDay: number): Date {
  const year = from.getFullYear()
  const month = from.getMonth()
  const day = from.getDate()

  let candidate = new Date(year, month, payDay)
  // treat the payday as the start of the new cycle: if today is the payday
  // or passed it, the next pay date should be next month
  if (day >= payDay) {
    // next month
    candidate = new Date(year, month + 1, payDay)
  }

  // if payDay exceeds month length, use last day of month
  const last = lastDayOfMonth(candidate)
  if (payDay > last.getDate()) {
    return last
  }
  return candidate
}

export function daysUntil(next: Date, from: Date = new Date()): number {
  const diff = differenceInCalendarDays(next, from)
  return Math.max(0, diff)
}

export type DailyProjection = {
  date: string
  budget: number
}

export function computeDailyProjection(
  netSalary: number,
  fixedExpenses: FixedExpense[],
  variableExpenses: VariableExpense[],
  payDay: number,
  savingsPercent: number = 0.2,
  today: Date = new Date()
): { todayBudget: number; daysRemaining: number; totalRemaining: number; projection: DailyProjection[] } {
  const allocations = calculate50_30_20(netSalary, fixedExpenses)
  // note: calculate50_30_20 accepts savingsPercent as third param; pass through
  const allocations2 = calculate50_30_20(netSalary, fixedExpenses, savingsPercent)
  const nextPay = getNextPayDate(today, payDay)
  // do NOT include the payday itself in the previous period; daysLeft is
  // the number of days remaining until the payday (exclusive)
  const daysLeft = daysUntil(nextPay, today)

  // compute total spent so far in this pay period (from previous pay date exclusive)
  const prevPay = new Date(nextPay)
  prevPay.setMonth(nextPay.getMonth() - 1)

  const prevPayKey = getLocalISODateFromDate(prevPay)
  const todayKey = getLocalISODateFromDate(today)

  // period is (prevPay, nextPay) i.e. dates strictly greater than prevPay and
  // strictly less than nextPay. For spentSoFar we consider dates up to yesterday
  // (exclude today) so compare v.date > prevPayKey && v.date < todayKey
  const spentSoFar = variableExpenses
    .map(v => ({ ...v, _day: v.date.split('T')[0] }))
    .filter(v => v._day > prevPayKey && v._day < todayKey)
    .reduce((s, v) => s + v.amount, 0)

  const totalAvailable = allocations2.availableForVariables

  const totalRemaining = totalAvailable - spentSoFar

  const todayBudget = daysLeft > 0 ? totalRemaining / daysLeft : 0

  const projection: DailyProjection[] = []
  // projection covers today up to the day before payday
  for (let i = 0; i < daysLeft; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    projection.push({ date: getLocalISODateFromDate(d), budget: Math.round((totalRemaining / daysLeft) * 100) / 100 })
  }

  return { todayBudget: Math.round(todayBudget * 100) / 100, daysRemaining: daysLeft, totalRemaining: Math.round(totalRemaining * 100) / 100, projection }
}

export function computeSmartDailyProjection(
  netSalary: number,
  fixedExpenses: FixedExpense[],
  variableExpenses: VariableExpense[],
  payDay: number,
  savingsPercent: number = 0.2,
  today: Date = new Date()
): {
  todayBudget: number;
  daysRemaining: number;
  totalRemaining: number;
  totalVariableSpent: number;
  projection: DailyProjection[];
  tomorrowBudget: number;
  startsNewCycleTomorrow: boolean;
  spentLessThanPlanned: boolean;
} {
  const allocations = calculate50_30_20(netSalary, fixedExpenses, savingsPercent)

  const nextPay = getNextPayDate(today, payDay)
  // days until payday (exclusive)
  const daysLeft = daysUntil(nextPay, today)

  const prevPay = new Date(nextPay)
  prevPay.setMonth(nextPay.getMonth() - 1)

  // group spent per day within period (prevPay, nextPay) exclusive boundaries
  const spentByDay = new Map<string, number>()
  const prevPayKey = getLocalISODateFromDate(prevPay)
  const nextPayKey = getLocalISODateFromDate(nextPay)
  const todayKey = getLocalISODateFromDate(today)

  variableExpenses.forEach(v => {
    const day = v.date.split('T')[0]
    if (day >= prevPayKey && day < nextPayKey) {
      spentByDay.set(day, (spentByDay.get(day) || 0) + v.amount)
    }
  })
  // Sum spent before today (exclusive) and up to today (inclusive)
  const spentBeforeToday = Array.from(spentByDay.entries())
    .filter(([date]) => date < todayKey)
    .reduce((s, [, amt]) => s + amt, 0)

  const spentUpToToday = Array.from(spentByDay.entries())
    .filter(([date]) => date <= todayKey)
    .reduce((s, [, amt]) => s + amt, 0)

  const totalAvailable = allocations.availableForVariables
  const totalRemaining = totalAvailable - spentUpToToday

  const spentToday = spentByDay.get(todayKey) || 0

  const idealDailyBudget =
    daysLeft > 0
      ? totalAvailable / daysLeft
      : 0

  const spentLessThanPlanned =
    spentToday < idealDailyBudget

  const daysRemaining = daysLeft
  if (daysRemaining === 0) {
    return { todayBudget: 0, daysRemaining: 0, totalRemaining: 0, totalVariableSpent: 0, projection: [], tomorrowBudget: 0, startsNewCycleTomorrow: false, spentLessThanPlanned: false }
  }

  const projection: DailyProjection[] = []

  // We'll distribute the remaining available amount sequentially across the remaining days.
  // Start with available at beginning of today (exclude today's spend)
  let remainingAvailable = totalAvailable - spentBeforeToday

  for (let i = 0; i < daysRemaining; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dayKey = getLocalISODateFromDate(d)
    const remainingDays = daysRemaining - i
    const allocationForDay = remainingDays > 0 ? remainingAvailable / remainingDays : 0
    const spentOnDay = spentByDay.get(dayKey) || 0
    const budgetForDay = Math.round((allocationForDay - spentOnDay) * 100) / 100
    projection.push({ date: dayKey, budget: budgetForDay })
    // after accounting today's spend, reduce remainingAvailable
    remainingAvailable = remainingAvailable - spentOnDay
  }

  const todayBudget = projection[0]?.budget ?? 0
  let tomorrowBudget = 0

  const startsNewCycleTomorrow = daysRemaining === 1

  if (startsNewCycleTomorrow) {
    const nextCycleAvailable = allocations.availableForVariables

    const nextCyclePayDate = getNextPayDate(nextPay, payDay)

    const nextCycleDays = daysUntil(nextCyclePayDate, nextPay)

    tomorrowBudget =
      nextCycleDays > 0
        ? Math.round((nextCycleAvailable / nextCycleDays) * 100) / 100
        : 0
  } else {
    const remainingAfterToday = totalAvailable - spentUpToToday

    tomorrowBudget =
      daysRemaining > 1
        ? Math.round((remainingAfterToday / (daysRemaining - 1)) * 100) / 100
        : 0
  }

  return {
    todayBudget: Math.round(todayBudget * 100) / 100,
    daysRemaining,
    totalRemaining: Math.round(totalRemaining * 100) / 100,
    totalVariableSpent: Math.round(spentUpToToday * 100) / 100,
    projection,
    tomorrowBudget,
    startsNewCycleTomorrow,
    spentLessThanPlanned
  }
}

export function getUnifiedVariableExpenses(variableExpenses, sharedAdjustments) {
  const sharedAsExpenses = (sharedAdjustments || []).map(a => ({
    id: a.id,
    title: 'Compartilhado',
    amount: a.amount,
    category: 'shared',
    date: a.date
  }))

  return [...variableExpenses, ...sharedAsExpenses]
}
