import React, { useEffect } from 'react'

type ToastPayload = {
  message: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  actionLabel?: string
  onAction?: () => void
}

type ToastProps = {
  // can accept either a string or a payload object
  message?: string | ToastPayload | null
  onClose?: () => void
}

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => onClose && onClose(), 3000)
    return () => clearTimeout(t)
  }, [message, onClose])

  if (!message) return null

  const payload: ToastPayload = typeof message === 'string' ? { message, variant: 'info' } : message

  const bg = payload.variant === 'success' ? 'bg-emerald-500 text-white' : payload.variant === 'error' ? 'bg-red-500 text-white' : payload.variant === 'warning' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-white'
  const icon = payload.variant === 'success' ? '✓' : payload.variant === 'error' ? '✕' : payload.variant === 'warning' ? '⚠' : 'ℹ'

  return (
    <div
      aria-live="polite"
      className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md pointer-events-none"
    >
      <div
        onClick={() => onClose && onClose()}
        className={`${bg} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-opacity duration-300 cursor-pointer pointer-events-auto`}
      >
        <div className="text-lg font-bold">{icon}</div>
        <div className="flex-1 text-sm">{payload.message}</div>
        {payload.actionLabel && payload.onAction && (
          <button onClick={payload.onAction} className="ml-2 px-3 py-1 rounded bg-white/90 text-black">{payload.actionLabel}</button>
        )}
      </div>
    </div>
  )
}
