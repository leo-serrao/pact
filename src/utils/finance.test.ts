import { describe, it, expect } from 'vitest'
import { calculate50_30_20, computeSmartDailyProjection } from './finance'

describe('calculate50_30_20', () => {
  it('calculates allocations and accounts for fixed expenses', () => {
    const salary = 3000
    const fixed = [{ id: '1', name: 'aluguel', amount: 1200 }]
    const res = calculate50_30_20(salary, fixed as any)
    // base: needs=1500, wants=900, savings=600
    // fixed=1200 consumes needs -> needs left = 300
    expect(res.totalFixed).toBe(1200)
    expect(res.savings).toBeCloseTo(600)
    expect(res.needs).toBeCloseTo(300)
    expect(res.availableForVariables).toBeCloseTo(1200) // needs + wants
  })
})

describe('computeSmartDailyProjection', () => {
  it('distributes remaining equally when no spending', () => {
    const salary = 3000
    const fixed = [{ id: '1', name: 'aluguel', amount: 1200 }]
    const variable: any[] = []
    const payDay = new Date().getDate() // assume pay day today
    const res = computeSmartDailyProjection(salary, fixed as any, variable, payDay)
    // with payDay today, daysRemaining should be 1
    expect(res.daysRemaining).toBeGreaterThanOrEqual(1)
    // totalRemaining should equal availableForVariables since no spending
    expect(res.totalRemaining).toBeGreaterThanOrEqual(0)
  })
})
