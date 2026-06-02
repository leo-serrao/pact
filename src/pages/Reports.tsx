import React, { useMemo, useState } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format, subDays } from 'date-fns'
import { toCSV, downloadCSV } from '../utils/csv'

import {ChevronDown} from 'lucide-react'

const COLORS = ['#0ea5a4', '#60a5fa', '#f97316', '#f43f5e', '#a78bfa', '#fb7185']

export default function Reports() {
  const { variableExpenses, sharedAdjustments, fixedExpenses} = useFinanceStore()
  const [days, setDays] = useState(30)
  const isMobile = window.innerWidth < 640

  const since = subDays(new Date(), days - 1)

  const allExpenses = useMemo(() => {
    return [
      ...variableExpenses,
      ...sharedAdjustments.map(a => ({
        ...a,
        category: 'compartilhados'
      }))
    ]
  }, [variableExpenses, sharedAdjustments])

  const dailyData = useMemo(() => {
    const map = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      map.set(format(d, 'dd/MM'), 0)
    }
    allExpenses.forEach(v => {
      const d = new Date(v.date)
      if (d >= since) {
        const key = format(d, 'dd/MM')
        map.set(key, (map.get(key) || 0) + v.amount)
      }
    })
    return Array.from(map.entries()).map(([date, amount]) => ({ date, amount }))
  }, [allExpenses, days])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    allExpenses.forEach(v => {
      const d = new Date(v.date)
      if (d >= since) {
        const categoryKey = v.category
        const normalizeCategory = (cat: string) =>
          cat
            .trim()
            .toLowerCase()
            .replace(/^./, c => c.toUpperCase())

        const category = normalizeCategory(v.category)
        map.set(category, (map.get(category) || 0) + v.amount)
      }
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [allExpenses, days])

  const fixedCategoryData = useMemo(() => {
    const map = new Map<string, number>()

    fixedExpenses.forEach(f => {
      const key = f.category // bills | subscriptions
      map.set(key, (map.get(key) || 0) + f.amount)
    })

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value
    }))
  }, [fixedExpenses])

  function formatFixedCategory(label: string) {
    switch (label) {
      case 'bills':
        return 'Contas'
      case 'subscriptions':
        return 'Assinaturas'
      default:
        return label
    }
  }

  function handleExport() {
    const rows = allExpenses
      .filter(v => new Date(v.date) >= since)
      .map(v => ({ date: v.date, title: v.title, category: v.category, amount: v.amount, note: v.note || '' }))
    const csv = toCSV(rows, ['date', 'title', 'category', 'amount', 'note'])
    downloadCSV(`expenses_last_${days}_days.csv`, csv)
  }

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null

    const value = payload[0].value

    return (
      <div className="
        bg-[var(--surface)]
        border border-[var(--border)]
        rounded-xl
        px-3 py-2
        shadow-sm
        min-w-[120px]
      ">
        <p className="text-xs text-[var(--text-muted)] mb-1">
          {label}
        </p>

        <p className="text-sm font-medium text-[var(--text-primary)]">
          R$ {value.toLocaleString('pt-BR')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          Relatórios
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Análise de gastos e distribuição por categoria.
        </p>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">

        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--text-secondary)]">
            Período
          </label>
          <div className="relative">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="
                h-11 pl-4 pr-10 rounded-2xl
                border border-[var(--border)]
                bg-[var(--surface)]
                text-sm text-[var(--text-primary)]
                outline-none
                appearance-none
                focus:border-[var(--primary)]
                focus:ring-4
                focus:ring-[rgba(96,136,121,0.10)]
              "
            >
              <option value={7}>7 dias</option>
              <option value={14}>14 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>90 dias</option>
            </select>

            <ChevronDown
              size={16}
              className="
              pointer-events-none
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              text-[var(--text-muted)]
              "
            />
          </div>
        </div>

        <button
          onClick={handleExport}
          className="
            h-11 md:ml-auto
            px-5 rounded-2xl
            bg-[var(--primary)]
            text-white text-sm font-medium
            transition-all duration-200
            hover:bg-[var(--primaryHover)]
            hover:shadow-[0_10px_24px_rgba(96,136,121,0.18)]
            active:scale-[0.99]
          "
        >
          Exportar CSV
        </button>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* DAILY CHART */}
        <div className="card p-5 md:p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Gastos diários
          </h3>

          <div className="w-full h-[260px]">
            <ResponsiveContainer>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#0ea5a4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CATEGORY CHART */}
        <div className="card p-5 md:p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Gastos variáveis por categoria
          </h3>

          <div className="w-full h-[260px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={isMobile ? false : ({ value }) =>`R$ ${value.toLocaleString('pt-BR')}`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>

                <Legend
                  formatter={(value) => {
                    const item = categoryData.find(
                      x => x.name === value
                    )

                    return `${value} — R$ ${item?.value.toLocaleString('pt-BR') ?? 0}`
                  }}
                />
                <Tooltip formatter={(value: number) =>`R$ ${value.toLocaleString('pt-BR')}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FIXED CHART */}
        <div className="card p-5 md:p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Gastos fixos por categoria
          </h3>

          <div className="w-full h-[260px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={fixedCategoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={isMobile ? false : ({ value }) =>
                    `R$ ${value.toLocaleString('pt-BR')}`
                  }
                >
                  {fixedCategoryData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString('pt-BR')}`
                  }
                />

                <Legend
                  formatter={(value) => {
                    const item = fixedCategoryData.find(
                      x => x.name === value
                    )

                    return `${formatFixedCategory(value)} — R$ ${item?.value.toLocaleString('pt-BR') ?? 0}`
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
