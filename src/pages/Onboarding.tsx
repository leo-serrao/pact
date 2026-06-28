import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useFinanceStore } from '../store/useFinanceStore'
import { setUserProfile } from '../services/profile'
import CurrencyInput from '../components/CurrencyInput'
import { acceptInvite, createPartnership, generateInviteLink } from '../services/sharedGroups'
import { getPendingInvite, clearPendingInvite } from '../utils/invite'
import { Copy, Check } from 'lucide-react'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-300"
          style={{
            width: i === current ? '24px' : '6px',
            height: '6px',
            borderRadius: '9999px',
            background: i === current
              ? 'var(--primary)'
              : i < current
              ? 'rgba(96,136,121,0.4)'
              : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fadein">
      <img
        src="/no_text_logo.png"
        alt="Pact"
        className="w-20 h-20 opacity-90"
        style={{ filter: 'brightness(1.1)' }}
      />

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--text-primary)]">
          Bem-vindo ao Pact
        </h1>
        <p className="text-base text-[var(--text-secondary)] max-w-sm leading-relaxed">
          Finanças a dois. Um lugar só para você e seu parceiro organizarem a vida financeira juntos.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs text-left">
        {[
          { icon: '📊', text: 'Controle individual e compartilhado' },
          { icon: '⚖️', text: 'Divisão automática de gastos' },
          { icon: '🏦', text: 'Metas e reservas financeiras' },
        ].map(({ icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-sm text-[var(--text-secondary)]">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-xs h-12 rounded-2xl bg-[var(--primary)] text-white text-sm font-medium transition-all duration-200 hover:shadow-[0_10px_24px_rgba(96,136,121,0.25)] active:scale-[0.99]"
      >
        Começar →
      </button>
    </div>
  )
}

function StepProfile({
  displayName, setDisplayName,
  netSalary, setNetSalary,
  savingsPercent, setSavingsPercent,
  onNext, onBack,
}: {
  displayName: string
  setDisplayName: (v: string) => void
  netSalary: number
  setNetSalary: (v: number) => void
  savingsPercent: number
  setSavingsPercent: (v: number) => void
  onNext: () => void
  onBack: () => void
}) {
  const [error, setError] = useState('')

  function handleNext() {
    if (!displayName.trim()) { setError('Como devemos te chamar?'); return }
    if (netSalary <= 0) { setError('Informe seu salário líquido'); return }
    setError('')
    onNext()
  }

  const pct = Math.round(savingsPercent * 100)

  return (
    <div className="flex flex-col gap-6 animate-fadein">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Seu perfil financeiro
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Essas informações são só suas e ficam seguras no app.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Como você quer ser chamado?
          </label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Seu nome ou apelido"
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Salário líquido mensal
          </label>
          <CurrencyInput
            value={netSalary}
            onChange={setNetSalary}
            className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]"
          />
          <p className="text-xs text-[var(--text-muted)]">
            O valor que você recebe após impostos e descontos.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Meta de reserva mensal
            </label>
            <span className="text-sm font-semibold text-[var(--primary)]">{pct}%</span>
          </div>

          <input
            type="range" min={5} max={50} step={5} value={pct}
            onChange={e => setSavingsPercent(Number(e.target.value) / 100)}
            className="w-full accent-[var(--primary)] cursor-pointer"
          />

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 flex flex-col gap-1">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Regra 50-30-20</p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              O Pact usa essa regra como base: <strong>50%</strong> para necessidades fixas, <strong>30%</strong> para gastos variáveis e <strong>20%</strong> para reservas. O padrão de 20% é o recomendado, mas você pode ajustar conforme sua realidade.
            </p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)]"
        >
          Voltar
        </button>
        <button
          onClick={handleNext}
          className="h-12 flex-[2] rounded-2xl bg-[var(--primary)] text-white text-sm font-medium transition-all duration-200 hover:shadow-[0_10px_24px_rgba(96,136,121,0.25)] active:scale-[0.99]"
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

function StepPartner({
  userId,
  onFinish,
  onBack,
  loading,
}: {
  userId: string
  onFinish: () => void
  onBack: () => void
  loading: boolean
}) {
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerateLink() {
    setGenerating(true)
    try {
      const partnership = await createPartnership(userId)
      const link = await generateInviteLink(partnership.id)
      setInviteLink(link)
    } catch (err) {
      console.error('Failed to create partnership', err)
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 animate-fadein">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Convide seu parceiro
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          O Pact foi feito para dois. Mas você pode explorar sozinho por enquanto.
        </p>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[rgba(96,136,121,0.15)] flex items-center justify-center text-xl shrink-0">
            🧑
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[var(--primary)] opacity-60" />
            <div className="w-2 h-2 rounded-full bg-[var(--primary)] opacity-40" />
            <div className="w-2 h-2 rounded-full bg-[var(--primary)] opacity-20" />
          </div>
          <div className="w-12 h-12 rounded-full bg-[rgba(96,136,121,0.08)] border-2 border-dashed border-[rgba(96,136,121,0.3)] flex items-center justify-center text-xl shrink-0">
            🧑
          </div>
        </div>

        {!inviteLink ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Gere um link e compartilhe com seu parceiro. Ao abrir o link, ele entra no Pact já conectado a você.
            </p>
            <button
              onClick={handleGenerateLink}
              disabled={generating}
              className="h-10 w-full rounded-xl bg-[var(--primary)] text-white text-sm font-medium transition-all hover:shadow-[0_8px_20px_rgba(96,136,121,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? 'Gerando link...' : 'Gerar link de convite'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Link gerado! Compartilhe com seu parceiro:
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2">
              <span className="flex-1 truncate text-xs font-mono text-[var(--text-secondary)]">
                {inviteLink}
              </span>
              <button
                onClick={handleCopy}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-white transition hover:shadow-md"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-[var(--primary)] text-center">Link copiado!</p>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              O link é válido para um uso e expira após ser aceito.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-12 flex-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)]"
        >
          Voltar
        </button>
        <button
          onClick={onFinish}
          disabled={loading}
          className="h-12 flex-[2] rounded-2xl bg-[var(--primary)] text-white text-sm font-medium transition-all duration-200 hover:shadow-[0_10px_24px_rgba(96,136,121,0.25)] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Salvando...' : 'Entrar no Pact →'}
        </button>
      </div>

      <button
        onClick={onFinish}
        disabled={loading}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition text-center"
      >
        Pular por agora
      </button>
    </div>
  )
}

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { setProfile } = useFinanceStore()

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [netSalary, setNetSalary] = useState<number>(0)
  const [payDay] = useState<number>(5)
  const [savingsPercent, setSavingsPercent] = useState<number>(0.2)

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    try {
      await setUserProfile(user.id, {
        display_name: displayName.trim() || undefined,
        net_salary: netSalary,
        pay_day: payDay,
        savings_percent: savingsPercent,
      })
      setProfile({
        uid: user.id,
        email: user.email ?? undefined,
        displayName: displayName.trim() || user.email || undefined,
        netSalary,
        payDay,
        savingsPercent,
      })

      // Accept pending invite if user came from an invite link
      const pendingToken = getPendingInvite()
      if (pendingToken) {
        try {
          const result = await acceptInvite(pendingToken)
          clearPendingInvite()
          navigate(`/shared/${result.partnership_id}`)
          return
        } catch (err) {
          console.error('Failed to accept pending invite', err)
          clearPendingInvite()
        }
      }

      navigate('/')
    } catch (err) {
      console.error('Failed to save onboarding profile', err)
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = 3

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--bg)]">
      <div className="w-full max-w-md flex flex-col gap-8">

        {step > 0 && (
          <div className="flex items-center justify-between">
            <StepDots current={step - 1} total={totalSteps - 1} />
            <span className="text-xs text-[var(--text-muted)]">{step} de {totalSteps - 1}</span>
          </div>
        )}

        {step === 0 && <StepWelcome onNext={() => setStep(1)} />}

        {step === 1 && (
          <StepProfile
            displayName={displayName}
            setDisplayName={setDisplayName}
            netSalary={netSalary}
            setNetSalary={setNetSalary}
            savingsPercent={savingsPercent}
            setSavingsPercent={setSavingsPercent}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}

        {step === 2 && user && (
          <StepPartner
            userId={user.id}
            onFinish={handleFinish}
            onBack={() => setStep(1)}
            loading={loading}
          />
        )}

      </div>
    </div>
  )
}