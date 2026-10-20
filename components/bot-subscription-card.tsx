'use client'

import { useState } from 'react'
import { Check, CreditCard, Loader2, QrCode, ShieldCheck, Smartphone } from 'lucide-react'
import { createBotSubscriptionCheckout } from '@/app/actions/bot-subscription'

export function BotSubscriptionCard({ isActivated }: { isActivated: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isActivated) return null

  const startCheckout = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = await createBotSubscriptionCheckout()
      window.location.assign(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open payment')
      setLoading(false)
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 p-5 shadow-xl shadow-amber-950/20 sm:p-6" aria-labelledby="bot-subscription-title">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" /> Bot activation
          </div>
          <h2 id="bot-subscription-title" className="text-balance text-xl font-black text-white sm:text-2xl">Activate your Algo Bot</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-300">Unlock automated strategies, bot controls, and live trading tools for just <strong className="text-amber-300">₹999 per month</strong>.</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
            {['All bot strategies', 'Cancel anytime', 'Secure Stripe checkout'].map(item => <span key={item} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" />{item}</span>)}
          </div>
        </div>
        <div className="relative shrink-0 lg:min-w-56">
          <div className="mb-3 text-center lg:text-right"><span className="text-3xl font-black text-white">₹999</span><span className="text-sm text-slate-400"> / month</span></div>
          <button onClick={startCheckout} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {loading ? 'Opening secure checkout…' : 'Activate with ₹999'}
          </button>
          <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500"><span className="inline-flex items-center gap-1"><Smartphone className="h-3 w-3" /> UPI</span><span className="inline-flex items-center gap-1"><QrCode className="h-3 w-3" /> QR</span><span>Cards</span></div>
          {error && <p className="mt-2 text-center text-xs text-red-400" role="alert">{error}</p>}
        </div>
      </div>
    </section>
  )
}
