import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useFinanceStore } from '../store/useFinanceStore'
import { setUserProfile } from '../services/firestore'

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setProfile } = useFinanceStore()

  const [netSalary, setNetSalary] = useState<number>(0)
  const [payDay, setPayDay] = useState<number>(1)
  const [displayName, setDisplayName] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const profile = {
      netSalary,
      payDay,
      fixedExpenses: [],
      displayName: displayName || user.displayName
    }

    await setUserProfile(user.uid, profile)

    setProfile({
      uid: user.uid,
      email: user.email ?? undefined,
      ...profile
    })

    navigate('/')
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">

      {/* HEADER */}
      <div>
        <h1 className="text-[32px] font-semibold tracking-tight text-[var(--text-primary)]">
          Configuração inicial
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Vamos configurar sua base financeira para começar.
        </p>
      </div>

      {/* CARD */}
      <section className="card p-6 md:p-8">

        <form onSubmit={handleSubmit} className="grid gap-5">

          {/* Nome */}
          <div>
            <label className="text-sm text-[var(--text-secondary)]">
              Nome exibido
            </label>

            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Como você quer ser identificado"
              className="h-12 w-full px-4 text-base"
            />
          </div>

          {/* Salário */}
          <div>
            <label className="text-sm text-[var(--text-secondary)]">
              Salário líquido mensal
            </label>

            <input
              type="number"
              step="0.01"
              value={netSalary}
              onChange={e => setNetSalary(Number(e.target.value))}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          {/* PayDay */}
          <div>
            <label className="text-sm text-[var(--text-secondary)]">
              Dia do recebimento
            </label>

            <input
              type="number"
              min={1}
              max={31}
              value={payDay}
              onChange={e => setPayDay(Number(e.target.value))}
              className="h-12 w-full px-4 text-base"
            />
          </div>

          {/* CTA */}
          <div className="pt-2">
            <button type="submit" className="button-primary w-full">
              Salvar e continuar
            </button>
          </div>

        </form>

      </section>

    </div>
  )
}