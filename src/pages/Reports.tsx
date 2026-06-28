import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useFinanceStore } from '../store/useFinanceStore'
import { format, subDays } from 'date-fns'
import { toCSV, downloadCSV } from '../utils/csv'
import { ChevronDown } from 'lucide-react'
import {
  Chart,
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js'

Chart.register(
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
)

// Brand palette — primary first, then supporting tones
const PALETTE = ['#608879', '#9DB7A6', '#D6A85D', '#C96B6B', '#7F77DD', '#378ADD']

const DAYS_OPTIONS = [7, 14, 30, 90] as const
type DaysOption = typeof DAYS_OPTIONS[number]

// Resolve CSS variable values at runtime for Chart.js (canvas can't read CSS vars)
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function getRuntimeColors() {
  return {
    surface:  getCSSVar('--surface')  || '#FFFFFF',
    border:   getCSSVar('--border')   || '#D9DDD8',
    textSec:  getCSSVar('--text-secondary') || '#5F6361',
    textPri:  getCSSVar('--text-primary')   || '#1A1C1B',
    primary:  getCSSVar('--primary')        || '#608879',
    muted:    'rgba(96,136,121,0.22)',
  }
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

interface BarChartProps {
  data: { date: string; amount: number }[]
}

function DailyBarChart({ data }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const c = getRuntimeColors()

    const maxVal = Math.max(...data.map(d => d.amount), 1)

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'Gasto',
          data: data.map(d => d.amount),
          backgroundColor: data.map(d => d.amount >= maxVal * 0.6 ? c.primary : c.muted),
          hoverBackgroundColor: c.primary,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.surface,
            titleColor: c.textSec,
            bodyColor: c.textPri,
            borderColor: c.border,
            borderWidth: 1,
            cornerRadius: 10,
            padding: 10,
            callbacks: {
              label: ctx => 'R$ ' + (ctx.parsed.y as number).toLocaleString('pt-BR'),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: c.textSec,
              font: { size: 10 },
              autoSkip: true,
              maxTicksLimit: 10,
              maxRotation: 0,
            },
          },
          y: {
            grid: { color: c.border, lineWidth: 0.5 },
            border: { display: false },
            beginAtZero: true,
            ticks: {
              color: c.textSec,
              font: { size: 10 },
              callback: v => {
                const n = Number(v)
                return n >= 1000 ? 'R$' + Math.round(n / 100) / 10 + 'k' : 'R$' + n
              },
            },
          },
        },
      },
    })

    return () => { chartRef.current?.destroy() }
  }, [data])

  return (
    <div style={{ position: 'relative', width: '100%', height: '220px' }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Gráfico de barras com gastos diários"
      >
        Gastos diários.
      </canvas>
    </div>
  )
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

interface DonutChartProps {
  data: { name: string; value: number }[]
  formatName?: (name: string) => string
}

function DonutChart({ data, formatName }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  const total = data.reduce((s, d) => s + d.value, 0)
  const colors = PALETTE.slice(0, data.length)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return
    const c = getRuntimeColors()

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.map(d => formatName ? formatName(d.name) : d.name),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: colors,
          borderColor: c.surface,
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.surface,
            titleColor: c.textSec,
            bodyColor: c.textPri,
            borderColor: c.border,
            borderWidth: 1,
            cornerRadius: 10,
            padding: 10,
            callbacks: {
              label: ctx => {
                const val = ctx.parsed as number
                const pct = Math.round(val / total * 100)
                return 'R$ ' + val.toLocaleString('pt-BR') + ' (' + pct + '%)'
              },
            },
          },
        },
      },
      plugins: [{
        id: 'center-text',
        afterDraw(chart) {
          const { ctx, chartArea: { top, bottom, left, right } } = chart
          const cx = (left + right) / 2
          const cy = (top + bottom) / 2
          ctx.save()
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.font = '500 12px sans-serif'
          ctx.fillStyle = c.textPri
          ctx.fillText('R$ ' + Math.round(total).toLocaleString('pt-BR'), cx, cy)
          ctx.restore()
        },
      }],
    })

    return () => { chartRef.current?.destroy() }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-[var(--text-muted)]">
        Nenhum dado no período
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((d, i) => {
          const pct = Math.round(d.value / total * 100)
          const label = formatName ? formatName(d.name) : d.name
          return (
            <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
              <span
                className="inline-block h-2 w-2 rounded-sm flex-shrink-0"
                style={{ background: colors[i] }}
              />
              {label} {pct}%
            </span>
          )
        })}
      </div>
      {/* Canvas */}
      <div style={{ position: 'relative', width: '100%', height: '180px' }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Donut chart de distribuição por categoria"
        >
          Distribuição por categoria.
        </canvas>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const { variableExpenses, sharedAdjustments, fixedExpenses } = useFinanceStore()
  const [days, setDays] = useState<DaysOption>(30)

  const since = subDays(new Date(), days - 1)

  const allExpenses = useMemo(() => [
    ...variableExpenses,
    ...sharedAdjustments.map(a => ({ ...a, category: 'compartilhados' })),
  ], [variableExpenses, sharedAdjustments])

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
        const cat = v.category.trim().toLowerCase().replace(/^./, c => c.toUpperCase())
        map.set(cat, (map.get(cat) || 0) + v.amount)
      }
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [allExpenses, days])

  const fixedCategoryData = useMemo(() => {
    const map = new Map<string, number>()
    fixedExpenses.forEach(f => {
      map.set(f.category, (map.get(f.category) || 0) + f.amount)
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [fixedExpenses])

  function formatFixedCategory(label: string) {
    const map: Record<string, string> = {
      bills: 'Contas',
      subscriptions: 'Assinaturas',
      housing: 'Moradia',
      transport: 'Transporte',
      health: 'Saúde',
    }
    return map[label] ?? label.charAt(0).toUpperCase() + label.slice(1)
  }

  function handleExport() {
    const rows = allExpenses
      .filter(v => new Date(v.date) >= since)
      .map(v => ({ date: v.date, title: v.title, category: v.category, amount: v.amount, note: (v as any).note || '' }))
    const csv = toCSV(rows, ['date', 'title', 'category', 'amount', 'note'])
    downloadCSV(`expenses_last_${days}_days.csv`, csv)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          Relatórios
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          Análise de gastos e distribuição por categoria.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)]">Período</span>
        <div className="flex gap-1">
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                days === d
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="ml-auto h-9 px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-medium transition-all hover:bg-[var(--primary-hover)] hover:shadow-[0_8px_20px_rgba(96,136,121,0.18)] active:scale-[0.99]"
        >
          Exportar CSV
        </button>
      </div>

      {/* Daily bar chart */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Gastos diários</h3>
        <DailyBarChart data={dailyData} />
      </div>

      {/* Donut charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Variáveis por categoria</h3>
          <DonutChart data={categoryData} />
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Fixos por categoria</h3>
          <DonutChart data={fixedCategoryData} formatName={formatFixedCategory} />
        </div>

      </div>

    </div>
  )
}