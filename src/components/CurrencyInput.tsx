import React, { useState, useEffect } from 'react'

type Props = {
  value: number
  onChange: (v: number) => void
  className?: string
  placeholder?: string
}

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function parseCurrencyInput(raw: string): number {
  if (!raw) return 0
  // keep digits and comma/dot
  let s = raw.replace(/[^0-9,\.]/g, '')
  // remove thousand separators (dots) and convert comma to dot for decimals
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  // If there is a comma after last dot, treat dots as thousand separators
  s = s.replace(/\./g, '')
  s = s.replace(/,/g, '.')
  const n = parseFloat(s)
  if (isNaN(n)) return 0
  return Math.round(n * 100) / 100
}

export default function CurrencyInput({ value, onChange, className = '', placeholder }: Props) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState('')

  useEffect(() => {
    if (!editing) {
      setLocal(formatter.format(value ?? 0))
    }
  }, [value, editing])

  function handleFocus() {
    setEditing(true)
    // expose plain number without currency formatting for easier editing
    if (value) {
      // use dot as decimal separator in the editing field to be predictable
      setLocal(String(value.toFixed(2)).replace('.', ','))
    } else {
      setLocal('')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocal(e.target.value)
    const parsed = parseCurrencyInput(e.target.value)
    onChange(parsed)
  }

  function handleBlur() {
    setEditing(false)
    // ensure parent has consistent parsed value
    const parsed = parseCurrencyInput(local)
    onChange(parsed)
    setLocal(formatter.format(parsed))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  )
}
