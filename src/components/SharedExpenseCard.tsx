import { ArrowRight } from 'lucide-react'
import { currency } from '../utils/finance'

type Props = {
  expense: any
  groupName?: string
  onOpen: () => void
}

export default function SharedExpenseCard({
  expense,
  groupName,
  onOpen
}: Props) {
  return (
    <div
      className="
        rounded-3xl
        border border-dashed border-[var(--border)]
        bg-[var(--surface)]
        p-5
        shadow-[var(--shadow-soft)]
      "
    >
      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0 flex-1">

          <div className="break-words text-base font-semibold text-[var(--text-primary)]">
            {groupName || 'Compartilhado'}
          </div>

          <div className="mt-3">
            <span
              className="
                inline-flex items-center
                rounded-full
                px-3 py-1
                text-xs font-medium
                bg-[rgba(96,136,121,0.12)]
                text-[var(--primary)]
                border border-[rgba(96,136,121,0.18)]
              "
            >
              Compartilhado
            </span>
          </div>

          <div className="mt-3 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {currency.format(expense.amount)}
          </div>

        </div>

        <div className="flex items-start">
          <button
            onClick={onOpen}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-xl
              text-[var(--primary)]
              transition-colors
              hover:bg-[var(--surface-secondary)]
            "
          >
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  )
}