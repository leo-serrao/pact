import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getInviteInfo, acceptInvite } from '../services/sharedGroups'
import { savePendingInvite, getPendingInvite, clearPendingInvite } from '../utils/invite'

type InviteState = 'loading' | 'valid' | 'invalid' | 'already_accepted' | 'accepting' | 'accepted' | 'error'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [state, setState] = useState<InviteState>('loading')
  const [inviteInfo, setInviteInfo] = useState<any>(null)
  const [partnershipId, setPartnershipId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    if (authLoading) return

    async function loadInvite() {
      try {
        const info = await getInviteInfo(token!)
        if (info.invite_accepted_at) {
          setState('already_accepted')
        } else {
          setInviteInfo(info)
          setState('valid')
        }
      } catch {
        setState('invalid')
      }
    }

    loadInvite()
  }, [token, authLoading])

  async function handleAccept() {
    if (!user) {
      // Save token and redirect to register
      savePendingInvite(token!)
      navigate('/register')
      return
    }

    setState('accepting')
    try {
      const result = await acceptInvite(token!)
      setPartnershipId(result.partnership_id)
      setState('accepted')
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao aceitar convite')
      setState('error')
    }
  }

  const inviterName = inviteInfo?.profiles?.display_name
    || inviteInfo?.profiles?.email
    || 'Alguém'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--bg)]">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo */}
        <img src="/no_text_logo.png" alt="Pact" className="w-16 h-16 opacity-90" />

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-[var(--text-secondary)]">Verificando convite...</p>
          </div>
        )}

        {state === 'valid' && (
          <div className="w-full flex flex-col gap-6 text-center">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                Você foi convidado
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>{inviterName}</strong> te convidou para uma parceria no Pact - Finanças a dois.
              </p>
            </div>

            {/* Info card */}
            <div className="
              rounded-3xl border border-[var(--border)]
              bg-[var(--surface)] p-5
              flex flex-col gap-3 text-left
            ">
              {[
                { icon: '⚖️', text: 'Divisão automática de gastos compartilhados' },
                { icon: '📊', text: 'Visão conjunta do saldo entre vocês' },
                { icon: '🤝', text: 'Liquidação de dívidas de forma simples' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm text-[var(--text-secondary)]">{text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleAccept}
                className="
                  h-12 w-full rounded-2xl
                  bg-[var(--primary)] text-white text-sm font-medium
                  transition-all duration-200
                  hover:shadow-[0_10px_24px_rgba(96,136,121,0.25)]
                  active:scale-[0.99]
                "
              >
                {user ? 'Aceitar convite' : 'Criar conta e aceitar'}
              </button>

              {user && (
                <button
                  onClick={() => navigate('/')}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
                >
                  Agora não
                </button>
              )}

              {!user && (
                <p className="text-xs text-[var(--text-muted)]">
                  Já tem conta?{' '}
                  <button
                    onClick={() => { savePendingInvite(token!); navigate('/login') }}
                    className="text-[var(--primary)] hover:underline"
                  >
                    Entrar
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {state === 'accepting' && (
          <p className="text-sm text-[var(--text-secondary)]">Entrando na parceria...</p>
        )}

        {state === 'accepted' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="
              w-16 h-16 rounded-full
              bg-[rgba(96,136,121,0.15)]
              flex items-center justify-center text-3xl
            ">
              🎉
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Parceria criada!</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Você e {inviterName} agora estão conectados no Pact.
              </p>
            </div>
            <button
              onClick={() => navigate(`/shared/${partnershipId}`)}
              className="
                h-12 w-full rounded-2xl
                bg-[var(--primary)] text-white text-sm font-medium
                transition-all duration-200
                hover:shadow-[0_10px_24px_rgba(96,136,121,0.25)]
              "
            >
              Ver parceria →
            </button>
          </div>
        )}

        {state === 'already_accepted' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Convite já utilizado</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Este link de convite já foi aceito por outra pessoa.
            </p>
            <Link to="/" className="text-sm text-[var(--primary)] hover:underline">
              Ir para o app
            </Link>
          </div>
        )}

        {(state === 'invalid' || state === 'error') && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {state === 'invalid' ? 'Convite inválido' : 'Algo deu errado'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {state === 'invalid'
                ? 'Este link de convite não existe ou expirou.'
                : errorMessage}
            </p>
            <Link to="/" className="text-sm text-[var(--primary)] hover:underline">
              Ir para o app
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}