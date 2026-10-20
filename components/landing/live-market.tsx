'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'

interface StrategyRun {
  id: number
  strategy: string
  market: string
  timeframe: string
  allocation: number
  returnPct: number
  profit: number
  drawdown: number
  status: 'Running' | 'Monitoring' | 'Paused'
  updated: number
}

const STRATEGIES = ['Trend Momentum', 'Mean Reversion', 'Breakout Alpha', 'Volatility Guard', 'Multi-Factor Core', 'Grid Adaptive', 'Statistical Edge', 'Momentum Shield']
const MARKETS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'NIFTY 50', 'GOLD/USD']
const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1D']

function generateRow(id: number): StrategyRun {
  const returnPct = 0.18 + Math.random() * 1.65
  return {
    id,
    strategy: STRATEGIES[id % STRATEGIES.length],
    market: MARKETS[id % MARKETS.length],
    timeframe: TIMEFRAMES[id % TIMEFRAMES.length],
    allocation: 1000 + (id % 5) * 750,
    returnPct,
    profit: returnPct / 100 * (1000 + (id % 5) * 750),
    drawdown: 0.12 + Math.random() * 1.1,
    status: id % 5 === 0 ? 'Monitoring' : 'Running',
    updated: 0,
  }
}

function buildData(): StrategyRun[] {
  const now = Date.now()
  return Array.from({ length: 24 }, (_, i) => ({ ...generateRow(i), updated: now }))
}

function SpreadBadge({ value }: { value: number }) {
  const color = value >= 0.8 ? '#00FF99' : value >= 0.4 ? '#00D4FF' : '#98A2B3'
  return (
    <span
      className="font-bold text-sm"
      style={{ color, textShadow: `0 0 10px ${color}60` }}
    >
      {value.toFixed(2)}%
    </span>
  )
}

const PAGE_SIZE = 8

export function LiveMarket() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<StrategyRun[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [pulse, setPulse] = useState<number[]>([])

  // Only run on client — avoids all SSR/client Math.random() hydration mismatches
  useEffect(() => {
    setData(buildData())
    setMounted(true)
  }, [])

  // Simulate live ticks
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        if (prev.length === 0) return prev
        const updateCount = 2 + Math.floor(Math.random() * 4)
        const indices = Array.from({ length: updateCount }, () =>
          Math.floor(Math.random() * prev.length)
        )
        setPulse(indices)
        setTimeout(() => setPulse([]), 600)
        const next = [...prev]
        indices.forEach((i) => {
          const row = next[i]
          if (!row) return
          const nextReturn = Math.max(0.05, row.returnPct + (Math.random() - 0.45) * 0.08)
          next[i] = { ...row, returnPct: nextReturn, profit: nextReturn / 100 * row.allocation, updated: Date.now() }
        })
        return next
      })
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  const filtered = data.filter((r) =>
    r.strategy.toLowerCase().includes(query.toLowerCase()) ||
    r.market.toLowerCase().includes(query.toLowerCase()) ||
    r.status.toLowerCase().includes(query.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const handleSearch = useCallback((v: string) => {
    setQuery(v)
    setPage(0)
  }, [])

  return (
    <section id="markets" className="py-28 relative">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#00D4FF]/4 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00D4FF]/20 bg-[#00D4FF]/5 text-[#00D4FF] text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF99] animate-pulse" />
            Live Market Data
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 text-balance">
            Live Market Preview
          </h2>
          <p className="text-[#98A2B3] text-lg max-w-xl mx-auto">
            Live algorithmic strategy runs with illustrative USDT P&L, allocation, drawdown, and execution status.
          </p>
        </motion.div>

        {/* Table card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-2xl border border-white/[0.08] bg-[#0E1324]/80 backdrop-blur-xl overflow-hidden shadow-[0_0_60px_rgba(0,212,255,0.06)]"
        >
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00D4FF]" />
              <span className="text-sm font-semibold text-white">AlgoBot Strategy Monitor</span>
              <span className="text-xs text-[#98A2B3] ml-2">{filtered.length} active runs</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#98A2B3]" />
                <input
                  type="text"
                  placeholder="Search strategy or market..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full sm:w-64 pl-8 pr-4 py-2 text-sm rounded-lg bg-white/[0.04] border border-white/[0.08] text-white placeholder-[#98A2B3] focus:outline-none focus:border-[#00D4FF]/40 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#00FF99]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                Live
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Strategy', 'Market', 'Timeframe', 'Allocation', 'Return', 'Profit', 'Drawdown', 'Status', 'Updated'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#98A2B3] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!mounted && Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {Array.from({ length: 9 }, (_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-white/[0.05] animate-pulse" style={{ width: `${40 + (j * 13) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))}
                {mounted && pageData.map((row, i) => {
                  const isUpdating = pulse.includes(data.indexOf(row))
                  return (
                    <motion.tr
                      key={row.id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                        isUpdating ? 'bg-[#00D4FF]/5' : ''
                      }`}
                      animate={isUpdating ? { backgroundColor: ['rgba(0,212,255,0.08)', 'rgba(0,212,255,0)'] } : {}}
                      transition={{ duration: 0.6 }}
                    >
                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{row.strategy}</td>
                      <td className="px-4 py-3 text-[#98A2B3] whitespace-nowrap">{row.market}</td>
                      <td className="px-4 py-3 text-[#98A2B3] whitespace-nowrap">{row.timeframe}</td>
                      <td className="px-4 py-3 text-white whitespace-nowrap font-mono text-xs">{row.allocation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</td>
                      <td className="px-4 py-3 whitespace-nowrap"><SpreadBadge value={row.returnPct} /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="font-bold text-sm text-[#00FF99]">+{row.profit.toFixed(2)} USDT</span></td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs text-orange-300">{row.drawdown.toFixed(2)}%</span></td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === 'Running' ? 'bg-[#00FF99]/10 text-[#00FF99]' : 'bg-[#00D4FF]/10 text-[#00D4FF]'}`}>{row.status}</span></td>
                      <td className="px-4 py-3 text-[#98A2B3] whitespace-nowrap text-xs">
                        {new Date(row.updated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-white/[0.06]">
            <span className="text-xs text-[#98A2B3]">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-white/[0.08] text-[#98A2B3] hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-7 h-7 text-xs rounded-lg transition-all ${
                    page === i
                      ? 'bg-[#00D4FF] text-[#050816] font-bold'
                      : 'text-[#98A2B3] hover:text-white border border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-white/[0.08] text-[#98A2B3] hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[['18,420 USDT', 'Illustrative total P&L'], ['+4.82%', 'Strategy basket return'], ['1.24%', 'Average drawdown'], ['8', 'Strategies monitored']].map(([value, label]) => <div key={label} className="rounded-xl border border-white/[0.08] bg-[#0E1324]/70 p-4"><p className="text-xl font-black text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[#98A2B3]">{label}</p></div>)}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-[#98A2B3]/60 mt-6 max-w-2xl mx-auto">
          Illustrative strategy metrics are simulated examples for demonstration and are not promises of future returns. Algorithmic trading involves significant risk; users are responsible for their own trading decisions.
        </p>
      </div>
    </section>
  )
}
