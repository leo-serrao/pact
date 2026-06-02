import { create } from 'zustand'
import { Profile, VariableExpense, FixedExpense } from '../types'

type State = {
  profile?: Profile | null
  variableExpenses: VariableExpense[]
  fixedExpenses: FixedExpense[]
  savingBoxes: import('../types').SavingBox[]
  sharedAdjustments: any[]
  setProfile: (p: Profile | null) => void
  setFixedExpenses: (f: FixedExpense[]) => void
  setVariableExpenses: (v: VariableExpense[]) => void
  addVariableExpense: (e: VariableExpense) => void
  addFixedExpense: (e: FixedExpense) => void
  setSavingBoxes: (b: import('../types').SavingBox[]) => void
  setSharedAdjustments: (data: any[]) => void
  addSavingBox: (b: import('../types').SavingBox) => void
  updateSavingBox: (b: import('../types').SavingBox) => void
  removeSavingBox: (id: string) => void
}

export const useFinanceStore = create<State>((set) => ({
  profile: null,
  variableExpenses: [],
  fixedExpenses: [],
  savingBoxes: [],
  sharedAdjustments: [],
  setProfile: (p) => set((s) => ({
    profile: p,
    fixedExpenses: p && (p as any).fixedExpenses !== undefined ? (p as any).fixedExpenses : s.fixedExpenses,
    variableExpenses: p && (p as any).variableExpenses !== undefined ? (p as any).variableExpenses : s.variableExpenses,
  })),
  setFixedExpenses: (f) => set({ fixedExpenses: f }),
  setVariableExpenses: (v) => set({ variableExpenses: v }),
  setSavingBoxes: (b) => set({ savingBoxes: b }),
  setSharedAdjustments: (data) => set({ sharedAdjustments: data }),
  addVariableExpense: (e) => set((s) => ({ variableExpenses: [...s.variableExpenses, e] })),
  addFixedExpense: (e) => set((s) => ({ fixedExpenses: [...s.fixedExpenses, e] }))
  ,
  addSavingBox: (b) => set((s) => ({ savingBoxes: s.savingBoxes.some(x => x.id === b.id) ? s.savingBoxes.map(x => x.id === b.id ? b : x) : [...s.savingBoxes, b] })),
  updateSavingBox: (b) => set((s) => ({ savingBoxes: s.savingBoxes.map(x => x.id === b.id ? b : x) })),
  removeSavingBox: (id) => set((s) => ({ savingBoxes: s.savingBoxes.filter(x => x.id !== id) }))
}))
