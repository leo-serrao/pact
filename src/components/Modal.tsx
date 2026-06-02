import React from 'react'

export default function Modal({
  title,
  children,
  onClose,
}: {
  title?: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
      "
    >
      {/* Backdrop */}
      <div
        className="
          absolute inset-0
          bg-black/40
          backdrop-blur-[6px]
        "
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="
          relative z-10
          w-full max-w-md
          mx-4

          rounded-[28px]
          border border-[var(--border)]
          bg-[var(--surface)]

          p-6 sm:p-7

          shadow-[0_20px_60px_rgba(0,0,0,0.10)]
        "
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="
              text-[22px]
              font-semibold
              tracking-[-0.02em]
              text-[var(--text-primary)]
            "
          >
            {title}
          </h2>

          <button
            onClick={onClose}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-xl
              text-[var(--text-secondary)]
              transition-colors
              hover:bg-[var(--surface-secondary)]
              hover:text-[var(--text-primary)]
            "
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  )
}