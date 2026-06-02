import React from 'react'

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        p-4
      "
    >
      
      {/* Backdrop */}
      <div
        className="
          absolute inset-0
          bg-black/45
          backdrop-blur-md
          animate-in fade-in duration-200
        "
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="
          relative z-10
          w-full max-w-md
          max-h-[calc(100vh-2rem)]
          overflow-y-auto
          overflow-hidden
          rounded-[28px]
          border border-[var(--border)]
          bg-[var(--surface)]
          shadow-[0_24px_80px_rgba(0,0,0,0.28)]
          
          animate-in slide-in-from-bottom-4
          sm:slide-in-from-bottom-0
          sm:zoom-in-95
          duration-200
        "
      >
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          
          <div className="min-w-0">
            <h3
              className="
                text-xl font-semibold tracking-tight
                text-[var(--text-primary)]
              "
            >
              {title}
            </h3>

            <p
              className="
                mt-3 text-sm leading-6
                text-[var(--text-secondary)]
              "
            >
              {message}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="
              flex h-9 w-9 shrink-0 items-center justify-center
              rounded-xl
              text-[var(--text-secondary)]
              transition-colors
              hover:bg-[var(--surface-secondary)]
              hover:text-[var(--text-primary)]
            "
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        {/* Footer */}
        <div
          className="
            flex flex-col-reverse gap-3
            border-t border-[var(--divider)]
            p-5

            sm:flex-row
            sm:justify-end
          "
        >
          <button
            onClick={onCancel}
            className="
              h-11 w-full rounded-2xl
              border border-[var(--border)]
              bg-[var(--surface)]
              px-5
              text-sm font-medium
              text-[var(--text-primary)]
              transition-all duration-200

              hover:bg-[var(--surface-secondary)]

              sm:w-auto
            "
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="
              h-11 w-full rounded-2xl
              bg-red-500
              px-5
              text-sm font-medium text-white
              transition-all duration-200

              hover:bg-red-600
              hover:shadow-[0_10px_24px_rgba(239,68,68,0.25)]

              active:scale-[0.99]

              sm:w-auto
            "
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}