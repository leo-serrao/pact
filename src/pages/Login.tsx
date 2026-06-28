import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  const { login, googleSignIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro no login')
    }
  }

  async function handleGoogle() {
    setError(null)
    setLoadingGoogle(true)

    try {
      await googleSignIn()
      // No need to navigate — Supabase will redirect back to the app
      // and onAuthStateChange in AuthContext will handle the session
    } catch (err: any) {
      setError(err.message || 'Erro no login com Google')
      setLoadingGoogle(false)
    }
  }

  return (
    <div className="relative w-full max-w-md">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-40">
        <div className="absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-[rgba(96,136,121,0.18)]" />
      </div>

      {/* Brand */}
      <div className="mb-12 flex flex-col items-center text-center">
        <img
          src="/text_logo.png"
          alt="Pact"
          className="h-16 w-auto object-contain select-none"
        />
        <p className="mt-6 max-w-[320px] text-[15px] leading-7 text-[var(--text-secondary)]">
          Clareza financeira para sua vida pessoal e compartilhada.
        </p>
      </div>

      {/* Card */}
      <div className="
        relative overflow-hidden rounded-[32px]
        border border-white/40 dark:border-white/5
        bg-[rgba(255,255,255,0.78)] dark:bg-[rgba(23,26,25,0.82)]
        p-7 sm:p-9
        shadow-[0_10px_40px_rgba(0,0,0,0.04)]
        backdrop-blur-2xl
      ">

        {/* Subtle top light */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70 dark:bg-white/10" />

        {/* Header */}
        <div className="mb-8">
          <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Entrar
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="
            mb-5 rounded-2xl
            border border-[rgba(201,107,107,0.20)]
            bg-[rgba(201,107,107,0.08)]
            px-4 py-3 text-sm text-[var(--danger)]
          ">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
              Email
            </label>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                h-12 w-full rounded-2xl
                border border-[var(--border)]
                bg-[var(--surface)] px-4 text-base
                text-[var(--text-primary)] outline-none
                transition-all duration-200
                placeholder:text-[var(--text-muted)]
                focus:border-[var(--primary)] focus:bg-white
                focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]
                dark:focus:bg-[var(--darkCard)]
              "
            />
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-medium text-[var(--text-secondary)]">
              Senha
            </label>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="
                h-12 w-full rounded-2xl
                border border-[var(--border)]
                bg-[var(--surface)] px-4 text-base
                text-[var(--text-primary)] outline-none
                transition-all duration-200
                placeholder:text-[var(--text-muted)]
                focus:border-[var(--primary)] focus:bg-white
                focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]
                dark:focus:bg-[var(--darkCard)]
              "
            />
          </div>

          <button
            type="submit"
            className="
              mt-3 h-12 w-full rounded-2xl
              bg-[var(--primary)] text-sm font-medium text-white
              transition-all duration-200
              hover:bg-[var(--primary-hover)]
              hover:shadow-[0_8px_20px_rgba(96,136,121,0.18)]
              active:scale-[0.995]
            "
          >
            Entrar
          </button>

        </form>

        {/* Divider */}
        <div className="my-7 flex items-center gap-4">
          <div className="h-px flex-1 bg-[var(--divider)]" />
          <span className="text-[11px] font-medium tracking-[0.12em] text-[var(--text-muted)]">
            OU CONTINUE COM
          </span>
          <div className="h-px flex-1 bg-[var(--divider)]" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loadingGoogle}
          className="
            flex h-12 w-full items-center justify-center gap-3
            rounded-2xl
            border border-[var(--border)]
            bg-[rgba(255,255,255,0.55)] dark:bg-[rgba(255,255,255,0.02)]
            text-sm font-medium text-[var(--text-primary)]
            transition-all duration-200
            hover:bg-[var(--surface-secondary)]
            hover:border-[var(--primaryLight)]
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loadingGoogle ? (
            <span className="text-xs text-[var(--text-muted)]">Redirecionando...</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21.805 10.023h-9.78v3.955h5.605c-.243 1.47-1.6 4.31-5.605 4.31-3.37 0-6.12-2.774-6.12-6.19 0-3.416 2.75-6.19 6.12-6.19 1.92 0 3.2.82 3.935 1.52l2.68-2.58C17.82 3.22 15.52 2 12.03 2 6.78 2 2.49 6.27 2.49 11.52s4.29 9.52 9.54 9.52c5.5 0 9.14-3.86 9.14-9.32 0-.63-.07-1.09-.36-1.7z"
                  fill="#EA4335"
                />
              </svg>
              Entrar com Google
            </>
          )}
        </button>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          Não possui conta?
          <Link
            to="/register"
            className="
              ml-1 font-medium text-[var(--primary)]
              transition-colors duration-200
              hover:text-[var(--primaryHover)]
            "
          >
            Criar conta
          </Link>
        </div>

      </div>
    </div>
  )
}