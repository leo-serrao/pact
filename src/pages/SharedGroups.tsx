import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { getUserByEmail, createSharedGroup, subscribeToSharedGroups } from '../services/sharedGroups'
import { SharedGroup } from '../types/shared'

export default function SharedGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<SharedGroup[]>([])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [toast, setToast] = useState<{ message: string; variant?: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  
  useEffect(() => {
    if (!user) return
    const unsub = subscribeToSharedGroups(user.uid, (gs) => {
      setGroups(gs)
    }, (err) => {
      console.error('SharedGroups listener error', err)
      setToast({ message: 'Sem permissão para ler grupos compartilhados', variant: 'error' })
    })
    return () => unsub()
  }, [user])

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault()
    if (!name.trim() || !email.trim()) { setToast({ message: 'Preencha nome e email', variant: 'warning' }); return }
    try {
      let other = null
      try {
        other = await getUserByEmail(email.trim())
      } catch (err) {
        console.error('Error fetching user by email', err)
        setToast({ message: 'Erro ao buscar usuário por email (permissão?)', variant: 'error' })
        return
      }
      if (!other) { setToast({ message: 'Usuário não encontrado', variant: 'error' }); return }
      if (!user) { setToast({ message: 'Usuário não autenticado', variant: 'error' }); return }
      const members = [user.uid, other.id].filter(Boolean) as string[]

      const groupData = { name: name.trim(), members }

      // basic validation against rules
      if (!Array.isArray(groupData.members) || groupData.members.length === 0) {
        setToast({ message: 'members inválido', variant: 'error' })
        return
      }
      if (!groupData.members.includes(user.uid)) {
        setToast({ message: 'Seu UID deve estar em members', variant: 'error' })
        return
      }

      await createSharedGroup(groupData)
      setToast({ message: 'Grupo criado', variant: 'success' })
      setOpen(false)
      setName('')
      setEmail('')
    } catch (err) {
      console.error(err)
      setToast({ message: 'Erro ao criar grupo', variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Grupos Compartilhados
          </h1>

          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Gerencie despesas e objetivos financeiros em conjunto.
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="
            h-12 w-full sm:w-auto
            rounded-2xl
            bg-[var(--primary)]
            px-5
            text-sm font-medium text-white
            transition-all duration-200
            hover:bg-[var(--primary-hover)]
            hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
            active:scale-[0.99]
          "
        >
          Novo grupo
        </button>

      </div>

      {/* Groups */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {groups.length === 0 ? (
          <div
            className="
              col-span-full
              rounded-3xl
              border border-dashed border-[var(--border)]
              bg-[var(--surface)]
              p-10
              text-center
              shadow-[var(--shadow-soft)]
            "
          >
            <p className="text-sm text-[var(--text-secondary)]">
              Você ainda não participa de nenhum grupo compartilhado.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <Link
              key={g.id}
              to={`/shared/${g.id}`}
              className="
                rounded-3xl
                border border-[var(--border)]
                bg-[var(--surface)]
                p-5
                shadow-[var(--shadow-soft)]
                transition-all duration-200
                hover:border-[var(--primary)]
                hover:shadow-[0_12px_28px_rgba(0,0,0,0.05)]
              "
            >
              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0 flex-1">

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex h-12 w-12 items-center justify-center
                        rounded-2xl
                        border border-[var(--border)]
                        bg-[var(--surface-secondary)]
                        text-lg
                        font-semibold
                        text-[var(--primary)]
                      "
                    >
                      {g.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div
                        className="
                          truncate
                          text-base
                          font-semibold
                          text-[var(--text-primary)]
                        "
                      >
                        {g.name}
                      </div>

                      <div className="text-sm text-[var(--text-secondary)]">
                        Grupo compartilhado
                      </div>

                    </div>

                  </div>

                  <div className="mt-5">

                    <span
                      className="
                        inline-flex items-center
                        rounded-full
                        border border-[rgba(96,136,121,0.18)]
                        bg-[rgba(96,136,121,0.10)]
                        px-3 py-1
                        text-xs font-medium
                        text-[var(--primary)]
                      "
                    >
                      {g.members?.length ?? 0} membro{(g.members?.length ?? 0) > 1 ? 's' : ''}
                    </span>

                  </div>

                </div>

              </div>
            </Link>
          ))
        )}

      </section>

      {open && (
        <Modal
          title="Novo grupo compartilhado"
          onClose={() => setOpen(false)}
        >
          <form
            onSubmit={(e) => handleCreate(e)}
            className="space-y-5"
          >

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Nome do grupo
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Casa"
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-base text-[var(--text-primary)]
                  outline-none
                  transition
                  placeholder:text-[var(--text-muted)]
                  focus:border-[var(--primary)]
                  focus:ring-4
                  focus:ring-[rgba(96,136,121,0.10)]
                "
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Email do outro usuário
              </label>

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@email.com"
                className="
                  h-12 w-full rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-4
                  text-base text-[var(--text-primary)]
                  outline-none
                  transition
                  placeholder:text-[var(--text-muted)]
                  focus:border-[var(--primary)]
                  focus:ring-4
                  focus:ring-[rgba(96,136,121,0.10)]
                "
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="
                  h-11 rounded-2xl
                  border border-[var(--border)]
                  bg-[var(--surface)]
                  px-5
                  text-sm font-medium
                  text-[var(--text-primary)]
                  transition
                  hover:bg-[var(--surface-secondary)]
                "
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="
                  h-11 rounded-2xl
                  bg-[var(--primary)]
                  px-5
                  text-sm font-medium text-white
                  transition-all duration-200
                  hover:bg-[var(--primary-hover)]
                  hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
                "
              >
                Criar grupo
              </button>

            </div>

          </form>
        </Modal>
      )}

      <Toast
        message={toast}
        onClose={() => setToast(null)}
      />

    </div>
  )
}
