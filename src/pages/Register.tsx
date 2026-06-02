import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register as registerService } from '../services/auth'
import { setUserProfile } from '../services/firestore'
import { useFinanceStore } from '../store/useFinanceStore'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()
  const { setProfile } = useFinanceStore()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Senhas não conferem')
      return
    }

    try {
      const cred = await registerService(email, password)
      const uid = cred.user.uid

      const profile = {
        netSalary: 0,
        payDay: 1,
        fixedExpenses: []
      }

      await setUserProfile(uid, profile)
      setProfile({ uid, email, ...profile })

      navigate('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Erro no cadastro')
    }
  }

  return (
    <div className="relative w-full max-w-md">

      {/* Glow background (igual login para consistência) */}
      <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-40">
        <div className="
          absolute left-1/2 top-10
          h-56 w-56 -translate-x-1/2
          rounded-full
          bg-[rgba(96,136,121,0.18)]
        " />
      </div>

      {/* Brand */}
      <div className="mb-10 flex flex-col items-center text-center">
        <img
          src="/text_logo.png"
          alt="Pact"
          className="h-16 w-auto select-none object-contain"
        />

        <p className="mt-5 max-w-[320px] text-[15px] leading-7 text-[var(--text-secondary)]">
          Crie sua conta e organize sua vida financeira de forma compartilhada.
        </p>
      </div>

      {/* Card */}
      <div className="
        relative overflow-hidden
        rounded-[32px]
        border border-[var(--border)]
        bg-[var(--surface)]
        p-7 sm:p-9
        shadow-[var(--shadow-card)]
      ">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Criar conta
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="
            mb-5 rounded-2xl
            border border-[rgba(201,107,107,0.20)]
            bg-[rgba(201,107,107,0.08)]
            px-4 py-3
            text-sm text-[var(--danger)]
          ">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
              Email
            </label>

            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
              Senha
            </label>

            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
              Confirmar senha
            </label>

            <input
              type="password"
              placeholder="Confirme sua senha"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="
              mt-3 h-12 w-full
              rounded-2xl
              bg-[var(--primary)]
              text-sm font-medium text-white
              transition-all duration-200

              hover:bg-[var(--primary-hover)]
              hover:shadow-[0_8px_20px_rgba(96,136,121,0.18)]

              active:scale-[0.995]
            "
          >
            Criar conta
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Já possui conta?

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="
            ml-1 font-medium
            text-[var(--primary)]
            transition-colors duration-200
            hover:text-[var(--primary-hover)]
          "
        >
          Entrar
        </button>
      </div>
    </div>
    
  )
}