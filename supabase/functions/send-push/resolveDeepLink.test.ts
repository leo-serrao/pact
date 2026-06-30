import { describe, it, expect } from 'vitest'
import { resolveDeepLink } from './resolveDeepLink'

describe('resolveDeepLink', () => {
  it('resolves new_shared_expense to the shared group route', () => {
    expect(resolveDeepLink('new_shared_expense', { partnership_id: 'abc123' })).toBe('/shared/abc123')
  })

  it('resolves debt_settled to the shared group route', () => {
    expect(resolveDeepLink('debt_settled', { partnership_id: 'abc123', settlement_id: 'set1' })).toBe('/shared/abc123')
  })

  it('resolves partner_joined to the shared group route', () => {
    expect(resolveDeepLink('partner_joined', { partnership_id: 'abc123' })).toBe('/shared/abc123')
  })

  it('falls back to home for an unknown type', () => {
    expect(resolveDeepLink('something_unexpected', { partnership_id: 'abc123' })).toBe('/')
  })

  it('falls back to home when data has no partnership_id', () => {
    expect(resolveDeepLink('new_shared_expense', {})).toBe('/')
  })

  it('falls back to home when data is null', () => {
    expect(resolveDeepLink('new_shared_expense', null)).toBe('/')
  })
})
