import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register as registerService, googleSignIn } from '../services/auth'

type Step = 'form' | 'confirm'

export default function Register() {
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) { setError('Senhas não conferem'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return }

    setLoading(true)
    try {
      await registerService(email, password)
      setStep('confirm')
    } catch (err: any) {
      setError(err.message || 'Erro no cadastro')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setGoogleLoading(true)
    try {
      await googleSignIn()
      // Redirect handled by Supabase OAuth callback
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google')
      setGoogleLoading(false)
    }
  }

  // ── Confirmation screen ──────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-40">
          <div className="absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-[rgba(96,136,121,0.18)]" />
        </div>

        <div className="mb-10 flex flex-col items-center text-center">
          <img src="/text_logo.png" alt="Pact" className="h-16 w-auto select-none object-contain" />
        </div>

        <div className="card p-8 flex flex-col items-center text-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(96,136,121,0.10)] border border-[rgba(96,136,121,0.18)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
              Confirme seu email
            </h1>
            <p className="text-sm leading-6 text-[var(--text-secondary)] max-w-[280px]">
              Enviamos um link de confirmação para{' '}
              <span className="font-medium text-[var(--text-primary)]">{email}</span>.
              Acesse seu email e clique no link para ativar sua conta.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-xs text-[var(--text-muted)] leading-5">
            Não encontrou o email? Verifique sua caixa de spam ou lixo eletrônico.
          </div>

          <button onClick={() => navigate('/login')} className="button-primary w-full text-sm font-medium">
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────
  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-40">
        <div className="absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-[rgba(96,136,121,0.18)]" />
      </div>

      <div className="mb-10 flex flex-col items-center text-center">
        <img src="/text_logo.png" alt="Pact" className="h-16 w-auto select-none object-contain" />
        <p className="mt-5 max-w-[320px] text-[15px] leading-7 text-[var(--text-secondary)]">
          Crie sua conta e organize sua vida financeira de forma compartilhada.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-9 shadow-[var(--shadow-card)]">

        <div className="mb-7">
          <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Criar conta
          </h1>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-[rgba(201,107,107,0.20)] bg-[rgba(201,107,107,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* Google sign up */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="
            mb-5 flex h-12 w-full items-center justify-center gap-3
            rounded-2xl border border-[var(--border)]
            bg-[var(--surface)] text-sm font-medium text-[var(--text-primary)]
            transition hover:bg-[var(--surface-secondary)]
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {googleLoading ? (
            <span className="text-[var(--text-muted)]">Conectando...</span>
          ) : (
            <>
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Cadastrar com Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)]">ou</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">Senha</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">Confirmar senha</label>
            <input
              type="password"
              placeholder="Confirme sua senha"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="h-12 w-full px-4 text-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="button-primary w-full mt-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Já possui conta?
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="ml-1 font-medium text-[var(--primary)] transition-colors duration-200 hover:text-[var(--primary-hover)]"
        >
          Entrar
        </button>
      </div>
    </div>
  )
}