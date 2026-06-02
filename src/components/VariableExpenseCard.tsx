import { Pencil, Trash2 } from 'lucide-react'
import { currency } from '../utils/finance'

type Props = {
  expense: any
  categoryLabel: string
  categoryStyles: string
  onEdit: () => void
  onDelete: () => void
}

export default function VariableExpenseCard({
  expense,
  categoryLabel,
  categoryStyles,
  onEdit,
  onDelete
}: Props) {
  return (
    <div
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

          <div className="break-words text-base font-semibold text-[var(--text-primary)]">
            {expense.title}
          </div>

          <div className="mt-3">
            <span
              className={`
                inline-flex items-center
                rounded-full
                px-3 py-1
                text-xs font-medium
                ${categoryStyles}
              `}
            >
              {categoryLabel}
            </span>
          </div>

          <div className="mt-3 text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            {currency.format(expense.amount)}
          </div>

        </div>

        <div className="flex items-start gap-1">

          <button
            onClick={onEdit}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-xl
              text-[var(--primary)]
              transition-colors
              hover:bg-[var(--surface-secondary)]
            "
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={onDelete}
            className="
              flex h-9 w-9 items-center justify-center
              rounded-xl
              text-red-500
              transition-colors
              hover:bg-red-50
              dark:hover:bg-red-950/20
            "
          >
            <Trash2 size={16} />
          </button>

        </div>

      </div>
    </div>
  )
}