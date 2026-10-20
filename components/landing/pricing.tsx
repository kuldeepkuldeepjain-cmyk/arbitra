'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  Zap,
  Bot,
  TrendingUp,
  ShieldCheck,
  Bell,
  BarChart3,
  Globe,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

const FREE_FEATURES = [
  { label: 'View top 5 arbitrage opportunities', included: true },
  { label: 'Live market ticker (15 coins)', included: true },
  { label: 'Basic portfolio tracking', included: true },
  { label: 'Community access', included: true },
  { label: 'Full arbitrage opportunity list (100+)', included: false },
  { label: 'Automated bot trading', included: false },
  { label: 'Multi-exchange price scanner', included: false },
  { label: 'Real-time profit alerts', included: false },
  { label: 'AI trade recommendations', included: false },
  { label: 'Priority opportunity detection', included: false },
]

const INR_PLANS = [
  { name: '1 Month', price: '₹999', detail: 'Flexible starter access' },
  { name: '3 Months', price: '₹1,999', detail: 'Quarterly momentum' },
  { name: '6 Months', price: '₹2,999', detail: 'Best for consistent use', popular: true },
  { name: '1 Year', price: '₹4,999', detail: 'Maximum long-term value' },
]

const BOT_FEATURES = [
  { icon: TrendingUp,  label: 'Full arbitrage opportunity list', sub: '100+ live opportunities across 12 exchanges' },
  { icon: Bot,         label: 'Automated bot trading',          sub: '24/7 trading bot with custom strategy settings' },
  { icon: Globe,       label: 'Multi-exchange scanner',         sub: 'Binance, OKX, Bybit, KuCoin, Gate.io & 8 more' },
  { icon: Bell,        label: 'Real-time profit alerts',        sub: 'Instant SMS & email alerts on hot opportunities' },
  { icon: BarChart3,   label: 'AI trade recommendations',       sub: 'GPT-powered entry/exit signals per coin' },
  { icon: ShieldCheck, label: 'Priority opportunity detection', sub: 'First access before free users see the data' },
  { icon: Zap,         label: 'Advanced filters & analytics',   sub: 'Filter by exchange, risk, volume, spread & more' },
  { icon: Sparkles,    label: 'Lifetime access — one payment',  sub: 'No monthly fees, no subscriptions, ever' },
]

export function Pricing() {
  const [hovered, setHovered] = useState<'free' | 'bot' | null>(null)

  return (
    <section id="pricing" className="relative py-24 overflow-hidden" style={{ backgroundColor: '#050816' }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0,255,153,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-5 text-xs font-semibold tracking-widest uppercase" style={{ borderColor: 'rgba(0,212,255,0.25)', color: '#00D4FF', backgroundColor: 'rgba(0,212,255,0.06)' }}>
            <Zap className="w-3 h-3" />
            Simple Pricing
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 text-balance">
            Choose Your AlgoBot Plan.{' '}
            <span style={{ color: '#00FF99' }}>Trade With Clarity.</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: '#98A2B3' }}>
            Start free, then choose the access period that fits your trading workflow. Paid AlgoBot activation is available in INR with clear, one-time plan pricing.
          </p>
        </div>

        <div className="mx-auto mb-10 grid max-w-3xl grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          {[['4', 'activation plans'], ['1', 'simple payment'], ['0', 'auto-renewals']].map(([value, label], index) => <div key={label} className={`px-3 py-4 text-center ${index > 0 ? 'border-l border-white/[0.08]' : ''}`}><p className="text-2xl font-black text-white">{value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]">{label}</p></div>)}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[0.78fr_1.22fr]">

          {/* Free Plan */}
          <div
            onMouseEnter={() => setHovered('free')}
            onMouseLeave={() => setHovered(null)}
            className="relative rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1"
            style={{
              backgroundColor: '#0E1324',
              borderColor: hovered === 'free' ? 'rgba(152,162,179,0.3)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#98A2B3' }}>Viewer</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-sm pb-2" style={{ color: '#98A2B3' }}>forever</span>
              </div>
              <p className="text-sm" style={{ color: '#98A2B3' }}>Great for exploring arbitrage concepts and getting started.</p>
            </div>

            <Link
              href="/sign-up"
              className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 mb-8"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Get Started Free
            </Link>

            <ul className="space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  {f.included
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#00FF99' }} />
                    : <XCircle     className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'rgba(152,162,179,0.4)' }} />
                  }
                  <span className="text-sm" style={{ color: f.included ? '#E2E8F0' : 'rgba(152,162,179,0.5)' }}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bot Plan */}
          <div
            onMouseEnter={() => setHovered('bot')}
            onMouseLeave={() => setHovered(null)}
            className="relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1"
            style={{
              background: 'linear-gradient(145deg, #0E1B2E 0%, #0A1628 50%, #071220 100%)',
              border: '1px solid rgba(0,212,255,0.35)',
              boxShadow: hovered === 'bot'
                ? '0 0 60px rgba(0,212,255,0.18), 0 0 120px rgba(0,255,153,0.08), inset 0 1px 0 rgba(0,212,255,0.15)'
                : '0 0 40px rgba(0,212,255,0.1), inset 0 1px 0 rgba(0,212,255,0.1)',
            }}
          >
            {/* Most Popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <div
                className="flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ background: 'linear-gradient(90deg, #00D4FF, #00FF99)', color: '#050816' }}
              >
                <Sparkles className="w-3 h-3" />
                Best Value
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#00D4FF' }}>AlgoBot Trading Plans</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {INR_PLANS.map((plan) => (
                  <div key={plan.name} className="relative rounded-xl p-3" style={{ backgroundColor: plan.popular ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)', border: plan.popular ? '1px solid rgba(0,212,255,0.45)' : '1px solid rgba(255,255,255,0.08)' }}>
                    {plan.popular && <span className="absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ backgroundColor: '#00D4FF', color: '#050816' }}>Popular</span>}
                    <p className="text-xs font-semibold text-white">{plan.name}</p>
                    <p className="mt-1 text-2xl font-black" style={{ color: '#00FF99' }}>{plan.price}</p>
                    <p className="mt-0.5 text-[10px]" style={{ color: '#98A2B3' }}>{plan.detail}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm" style={{ color: '#98A2B3' }}>Full AlgoBot access with strategy automation, risk controls, market scanning, and execution workflows. No hidden recurring charges.</p>
            </div>

            <Link
              href="/sign-up"
              className="group flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 mb-8"
              style={{
                background: 'linear-gradient(135deg, #00D4FF, #00FF99)',
                color: '#050816',
                boxShadow: '0 0 20px rgba(0,212,255,0.4)',
              }}
            >
              Unlock Everything Now
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BOT_FEATURES.map((f) => (
                <div
                  key={f.label}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0,212,255,0.1)' }}>
                    <f.icon className="w-3.5 h-3.5" style={{ color: '#00D4FF' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{f.label}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#98A2B3' }}>{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom reassurance */}
            <div
              className="mt-6 flex items-center justify-center gap-2 py-3 rounded-xl"
              style={{ backgroundColor: 'rgba(0,255,153,0.05)', border: '1px solid rgba(0,255,153,0.12)' }}
            >
              <Lock className="w-3.5 h-3.5" style={{ color: '#00FF99' }} />
              <span className="text-xs font-medium" style={{ color: '#00FF99' }}>
                Secure INR payment &nbsp;·&nbsp; Admin-reviewed activation &nbsp;·&nbsp; No hidden renewals
              </span>
            </div>
          </div>
        </div>

        {/* Bottom comparison note */}
        <p className="text-center mt-10 text-xs" style={{ color: 'rgba(152,162,179,0.5)' }}>
          * Paid AlgoBot activation plans are billed in INR. Payment and activation are reviewed through the secure dashboard workflow.
        </p>
      </div>
    </section>
  )
}
