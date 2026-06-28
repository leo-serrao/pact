import { create } from 'zustand'
import { Profile, VariableExpense, FixedExpense, SavingBox } from '../types'
import { Partnership } from '../types/shared'

type State = {
  profile: Profile | null
  fixedExpenses: FixedExpense[]
  variableExpenses: VariableExpense[]
  savingBoxes: SavingBox[]
  sharedAdjustments: any[]
  partnerships: Partnership[]

  setProfile: (p: Profile | null) => void
  setFixedExpenses: (f: FixedExpense[]) => void
  setVariableExpenses: (v: VariableExpense[]) => void
  setSavingBoxes: (b: SavingBox[]) => void
  setSharedAdjustments: (data: any[]) => void
  setPartnerships: (p: Partnership[]) => void

  addFixedExpense: (e: FixedExpense) => void
  updateFixedExpense: (e: FixedExpense) => void
  removeFixedExpense: (id: string) => void

  addVariableExpense: (e: VariableExpense) => void
  updateVariableExpense: (e: VariableExpense) => void
  removeVariableExpense: (id: string) => void

  addSavingBox: (b: SavingBox) => void
  updateSavingBox: (b: SavingBox) => void
  removeSavingBox: (id: string) => void
}

export const useFinanceStore = create<State>((set) => ({
  profile: null,
  fixedExpenses: [],
  variableExpenses: [],
  savingBoxes: [],
  sharedAdjustments: [],
  partnerships: [],

  setProfile: (p) => set({ profile: p }),
  setFixedExpenses: (f) => set({ fixedExpenses: f }),
  setVariableExpenses: (v) => set({ variableExpenses: v }),
  setSavingBoxes: (b) => set({ savingBoxes: b }),
  setSharedAdjustments: (data) => set({ sharedAdjustments: data }),
  setPartnerships: (p) => set({ partnerships: p }),

  addFixedExpense: (e) => set((s) => ({
    fixedExpenses: [...s.fixedExpenses, e]
  })),
  updateFixedExpense: (e) => set((s) => ({
    fixedExpenses: s.fixedExpenses.map(x => x.id === e.id ? e : x)
  })),
  removeFixedExpense: (id) => set((s) => ({
    fixedExpenses: s.fixedExpenses.filter(x => x.id !== id)
  })),

  addVariableExpense: (e) => set((s) => ({
    variableExpenses: [...s.variableExpenses, e]
  })),
  updateVariableExpense: (e) => set((s) => ({
    variableExpenses: s.variableExpenses.map(x => x.id === e.id ? e : x)
  })),
  removeVariableExpense: (id) => set((s) => ({
    variableExpenses: s.variableExpenses.filter(x => x.id !== id)
  })),

  addSavingBox: (b) => set((s) => ({
    savingBoxes: s.savingBoxes.some(x => x.id === b.id)
      ? s.savingBoxes.map(x => x.id === b.id ? b : x)
      : [...s.savingBoxes, b]
  })),
  updateSavingBox: (b) => set((s) => ({
    savingBoxes: s.savingBoxes.map(x => x.id === b.id ? b : x)
  })),
  removeSavingBox: (id) => set((s) => ({
    savingBoxes: s.savingBoxes.filter(x => x.id !== id)
  })),
}))