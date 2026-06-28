import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import Toast from '../components/Toast'
import {
  createPartnership, generateInviteLink,
  subscribeToPartnerships, deletePartnership, renamePartnership
} from '../services/sharedGroups'
import { Partnership } from '../types/shared'
import { Copy, Check, Link as LinkIcon, Trash2, Pencil } from 'lucide-react'

export default function SharedGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Partnership[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'warning' | 'info' } | null>(null)

  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null)

  // Rename state
  const [editingName, setEditingName] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToPartnerships(user.id, (ps) => {
      setGroups(ps)
    }, (err) => {
      console.error('Partnerships listener error', err)
      setToast({ message: 'Erro ao carregar parcerias', variant: 'error' })
    })
    return () => { unsub() }
  }, [user])

  async function handleCreate() {
    if (!user) return
    setCreating(true)
    try {
      const partnership = await createPartnership(user.id)
      const link = await generateInviteLink(partnership.id)
      setInviteLink(link)
    } catch (err: any) {
      console.error(err)
      setToast({ message: err.message || 'Erro ao criar parceria', variant: 'error' })
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCloseModal() {
    setOpen(false)
    setInviteLink(null)
    setCopied(false)
  }

  async function handleGenerateLink(partnershipId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      const link = await generateInviteLink(partnershipId)
      setInviteLink(link)
      setOpen(true)
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao gerar link', variant: 'error' })
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await deletePartnership(confirmDelete.id)
      setGroups(prev => prev.filter(g => g.id !== confirmDelete.id))
      setToast({ message: 'Parceria excluída', variant: 'success' })
    } catch (err: any) {
      console.error(err)
      setToast({ message: err.message || 'Erro ao excluir parceria', variant: 'error' })
    } finally {
      setConfirmDelete(null)
    }
  }

  function openRename(g: any, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditingName({ id: g.id, name: g.name || '' })
    setRenameValue(g.name || '')
  }

  async function handleRename() {
    if (!editingName || !renameValue.trim()) return
    setRenaming(true)
    try {
      await renamePartnership(editingName.id, renameValue.trim())
      setGroups(prev => prev.map(g =>
        g.id === editingName.id ? { ...g, name: renameValue.trim() } : g
      ))
      setToast({ message: 'Nome atualizado', variant: 'success' })
      setEditingName(null)
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao renomear', variant: 'error' })
    } finally {
      setRenaming(false)
    }
  }

  function getPartnershipLabel(g: any) {
    if (g.name) return g.name
    return g.role === 'owner' ? 'Sua parceria' : 'Parceria compartilhada'
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Parcerias
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Gerencie despesas e objetivos financeiros em conjunto.
          </p>
        </div>

        <button
          onClick={() => { setInviteLink(null); setOpen(true) }}
          className="
            h-12 w-full sm:w-auto rounded-2xl
            bg-[var(--primary)] px-5
            text-sm font-medium text-white
            transition-all duration-200
            hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
            active:scale-[0.99]
          "
        >
          + Nova parceria
        </button>
      </div>

      {/* Groups list */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.length === 0 ? (
          <div className="
            col-span-full rounded-3xl
            border border-dashed border-[var(--border)]
            bg-[var(--surface)] p-10 text-center shadow-[var(--shadow-soft)]
          ">
            <p className="text-sm text-[var(--text-secondary)]">
              Você ainda não tem nenhuma parceria. Crie uma e convide seu parceiro!
            </p>
          </div>
        ) : (
          groups.map((g: any) => (
            <Link
              key={g.id}
              to={`/shared/${g.id}`}
              className="
                rounded-3xl border border-[var(--border)]
                bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]
                transition-all duration-200
                hover:border-[var(--primary)]
                hover:shadow-[0_12px_28px_rgba(0,0,0,0.05)]
              "
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">

                  <div className="flex items-center gap-3">
                    <div className="
                      flex h-12 w-12 items-center justify-center shrink-0
                      rounded-2xl border border-[var(--border)]
                      bg-[var(--surface-secondary)]
                      text-lg font-semibold text-[var(--primary)]
                    ">
                      {g.inviteAcceptedAt ? '🤝' : '⏳'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-[var(--text-primary)]">
                        {getPartnershipLabel(g)}
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {g.inviteAcceptedAt
                          ? (g.role === 'owner' ? 'Você criou' : 'Você foi convidado')
                          : 'Aguardando parceiro aceitar'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="
                      inline-flex items-center rounded-full
                      border border-[rgba(96,136,121,0.18)]
                      bg-[rgba(96,136,121,0.10)]
                      px-3 py-1 text-xs font-medium text-[var(--primary)]
                    ">
                      {g.inviteAcceptedAt ? '2 membros' : '1 membro'}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Rename — any member */}
                      <button
                        onClick={(e) => openRename(g, e)}
                        className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                      >
                        <Pencil size={12} />
                        Renomear
                      </button>

                      {/* Invite link — owner only, hidden after accepted */}
                      {g.role === 'owner' && !g.inviteAcceptedAt && (
                        <button
                          onClick={(e) => handleGenerateLink(g.id, e)}
                          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                        >
                          <LinkIcon size={12} />
                          Convidar
                        </button>
                      )}

                      {/* Delete — owner only */}
                      {g.role === 'owner' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setConfirmDelete({ id: g.id })
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>

      {/* Create / invite modal */}
      {open && (
        <Modal
          title={inviteLink ? 'Link de convite' : 'Nova parceria'}
          onClose={handleCloseModal}
        >
          {!inviteLink ? (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Uma parceria conecta você e seu parceiro para gerenciar gastos e metas juntos. Ao criar, você receberá um link para compartilhar.
              </p>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 flex flex-col gap-2">
                {['💸 Divisão automática de gastos', '📊 Visão compartilhada do saldo', '🤝 Liquidação de dívidas entre vocês'].map(item => (
                  <p key={item} className="text-xs text-[var(--text-secondary)]">{item}</p>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button onClick={handleCloseModal} className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)]">
                  Cancelar
                </button>
                <button onClick={handleCreate} disabled={creating} className="h-11 rounded-2xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-all hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)] disabled:opacity-60 disabled:cursor-not-allowed">
                  {creating ? 'Criando...' : 'Criar e gerar link'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Compartilhe o link abaixo com seu parceiro. Ele poderá entrar no Pact e se conectar a você automaticamente.
              </p>
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                <p className="flex-1 truncate text-xs text-[var(--text-secondary)] font-mono">{inviteLink}</p>
                <button onClick={handleCopy} className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-white transition-all hover:shadow-md flex-shrink-0">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              {copied && <p className="text-xs text-[var(--primary)] text-center -mt-2">Link copiado!</p>}
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                O link é válido para um uso. Após seu parceiro aceitar, ele expira automaticamente.
              </p>
              <button onClick={handleCloseModal} className="h-11 w-full rounded-2xl bg-[var(--primary)] text-sm font-medium text-white transition-all hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]">
                Feito
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Rename modal */}
      {editingName && (
        <Modal title="Renomear parceria" onClose={() => setEditingName(null)}>
          <div className="flex flex-col gap-5">
            <input
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder="Ex: Casa, Viagem, Família"
              autoFocus
              className="
                h-12 w-full rounded-2xl
                border border-[var(--border)] bg-[var(--surface)]
                px-4 text-base outline-none transition
                placeholder:text-[var(--text-muted)]
                focus:border-[var(--primary)]
                focus:ring-4 focus:ring-[rgba(96,136,121,0.10)]
              "
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingName(null)} className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-secondary)]">
                Cancelar
              </button>
              <button onClick={handleRename} disabled={renaming || !renameValue.trim()} className="h-11 rounded-2xl bg-[var(--primary)] px-5 text-sm font-medium text-white transition-all hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)] disabled:opacity-60 disabled:cursor-not-allowed">
                {renaming ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Excluir parceria"
        message="Tem certeza? Todos os gastos e dados compartilhados desta parceria serão excluídos permanentemente."
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
      />

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}