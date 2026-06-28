import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications } from '../hooks/useNotifications'
import { formatBRDate } from '../utils/date'
import { X } from 'lucide-react'

function notificationIcon(type: string) {
  switch (type) {
    case 'new_shared_expense': return '💸'
    case 'debt_settled': return '✅'
    case 'partner_joined': return '🤝'
    default: return '🔔'
  }
}

type Props = {
  open: boolean
  onClose: () => void
  triggerRef: React.MutableRefObject<HTMLElement | null>
  notifications: ReturnType<typeof useNotifications>['notifications']
  unreadCount: number
  hasRead: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  deleteAllRead: () => Promise<void>
}

export default function NotificationPanel({
  open, onClose, triggerRef, notifications, unreadCount, hasRead,
  markAsRead, markAllAsRead, deleteNotification, deleteAllRead,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!open || !triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const panelWidth = 320
    const margin = 12
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const isMobile = viewportW < 1024

    if (isMobile) {
      const width = Math.min(panelWidth, viewportW - margin * 2)
      let left = rect.left + rect.width / 2 - width / 2
      left = Math.max(margin, Math.min(left, viewportW - width - margin))

      const topBelow = rect.bottom + margin
      const spaceBelow = viewportH - topBelow - margin
      const spaceAbove = rect.top - margin * 2

      let top: number
      let maxHeight: number
      if (spaceBelow >= 200 || spaceBelow >= spaceAbove) {
        top = topBelow
        maxHeight = Math.min(400, spaceBelow)
      } else {
        maxHeight = Math.min(400, spaceAbove)
        top = rect.top - maxHeight - margin
      }

      setStyle({ position: 'fixed', top, left, width, maxHeight, zIndex: 9999 })
    } else {
      const left = rect.right + margin
      const bottomFromViewport = viewportH - rect.bottom
      const maxHeight = Math.min(480, viewportH - bottomFromViewport - margin * 2)

      setStyle({
        position: 'fixed',
        bottom: bottomFromViewport,
        left: Math.min(left, viewportW - panelWidth - margin),
        width: panelWidth,
        maxHeight,
        zIndex: 9999,
      })
    }
  }, [open, triggerRef])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const target = e.target as Node
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose, triggerRef])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      style={style}
      className="
        rounded-3xl border border-[var(--border)]
        bg-[var(--surface)]
        shadow-[0_16px_48px_rgba(0,0,0,0.15)]
        overflow-hidden flex flex-col
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Notificações
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              Marcar lidas
            </button>
          )}
          {hasRead && (
            <button
              onClick={() => deleteAllRead()}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
            >
              Limpar lidas
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="text-2xl">🔔</span>
            <p className="text-sm text-[var(--text-muted)]">Nenhuma notificação ainda</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`
                flex items-start gap-3 px-4 py-3
                border-b border-[var(--border)] last:border-0
                ${!n.read_at ? 'bg-[rgba(96,136,121,0.05)]' : ''}
              `}
            >
              {/* Click area to mark as read */}
              <button
                onClick={() => { if (!n.read_at) markAsRead(n.id) }}
                className="flex items-start gap-3 flex-1 min-w-0 text-left transition-colors hover:opacity-80"
              >
                <span className="text-lg shrink-0 mt-0.5">{notificationIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read_at ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{n.body}</p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {formatBRDate(n.created_at)}
                  </p>
                </div>
              </button>

              {/* Right side: unread dot + delete */}
              <div className="flex flex-col items-center gap-2 shrink-0 mt-1">
                {!n.read_at && (
                  <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                )}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                  title="Apagar notificação"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  )
}