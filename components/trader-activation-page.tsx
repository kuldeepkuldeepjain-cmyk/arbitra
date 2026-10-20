'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, CreditCard, ShieldCheck } from 'lucide-react'
import { getActiveBotActivationPlans, getActivationPaymentMethods } from '@/app/actions/activation-payment-methods'
import { submitActivationFee } from '@/app/actions/referral'
import { Button } from '@/components/ui/button'

type Plan = { id: number; name: string; durationMonths: number; priceInr: string; description: string | null }
type Method = { id: number; label: string; upiId: string | null; qrImageUrl: string | null; instructions: string | null }

const fallbackPlans: Plan[] = [
  { id: 1, name: '1 Month', durationMonths: 1, priceInr: '999', description: 'Starter access' },
  { id: 2, name: '3 Months', durationMonths: 3, priceInr: '1999', description: 'Quarterly access' },
  { id: 3, name: '6 Months', durationMonths: 6, priceInr: '2999', description: 'Popular plan' },
  { id: 4, name: '12 Months', durationMonths: 12, priceInr: '4999', description: 'Annual value' },
]

export function TraderActivationPage() {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans)
  const [methods, setMethods] = useState<Method[]>([])
  const [selectedPlan, setSelectedPlan] = useState(fallbackPlans[0])
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null)
  const [utr, setUtr] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getActiveBotActivationPlans(), getActivationPaymentMethods()]).then(([loadedPlans, loadedMethods]) => {
      if (loadedPlans.length) { setPlans(loadedPlans); setSelectedPlan(loadedPlans[0]) }
      setMethods(loadedMethods)
      setSelectedMethod(loadedMethods[0] ?? null)
    }).catch(() => setMessage('Could not load the latest activation settings.'))
  }, [])

  async function submit() {
    if (!utr.trim()) return setMessage('Enter the UTR or transaction reference.')
    setSaving(true); setMessage(null)
    try { await submitActivationFee(utr.trim(), Number(selectedPlan.priceInr)); setMessage('Payment submitted. Admin will review your activation shortly.'); setUtr('') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Payment submission failed.') }
    finally { setSaving(false) }
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-amber-400/15 p-3"><ShieldCheck className="h-6 w-6 text-amber-300" /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Algo Bot Activation</p><h1 className="mt-1 text-2xl font-black text-white">Choose your activation plan</h1><p className="mt-2 text-sm text-slate-400">Pay in INR using an admin-configured UPI or payment method, then submit your UTR for approval.</p></div></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{plans.map(plan => <button key={plan.id} onClick={() => setSelectedPlan(plan)} className={`rounded-2xl border p-5 text-left transition ${selectedPlan.id === plan.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{plan.name}</p><p className="mt-2 text-2xl font-black text-white">₹{Number(plan.priceInr).toLocaleString('en-IN')}</p><p className="mt-2 text-xs text-slate-500">{plan.description}</p>{selectedPlan.id === plan.id && <CheckCircle2 className="mt-4 h-5 w-5 text-amber-300" />}</button>)}</div>
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-300" /><h2 className="font-bold text-white">INR payment options</h2></div><div className="mt-4 space-y-3">{methods.length ? methods.map(method => <button key={method.id} onClick={() => setSelectedMethod(method)} className={`w-full rounded-xl border p-4 text-left ${selectedMethod?.id === method.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-950/50'}`}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="font-semibold text-white">{method.label}</p>{method.upiId && <p className="mt-1 text-sm text-amber-300">{method.upiId}</p>}{method.instructions && <p className="mt-2 text-xs text-slate-500">{method.instructions}</p>}</div>{method.qrImageUrl && <img src={method.qrImageUrl} alt={`${method.label} INR payment QR code`} className="h-28 w-28 shrink-0 rounded-lg bg-white object-contain p-1" />}</div></button>) : <p className="text-sm text-slate-500">Payment options will appear when configured by admin.</p>}</div></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-bold text-white">Submit payment proof</h2><p className="mt-1 text-sm text-slate-500">Selected plan: ₹{Number(selectedPlan.priceInr).toLocaleString('en-IN')} for {selectedPlan.name}.</p><input value={utr} onChange={e => setUtr(e.target.value)} placeholder="Enter UTR / transaction reference" className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400" /><Button onClick={submit} disabled={saving} className="mt-3 w-full bg-amber-500 text-slate-950 hover:bg-amber-400">{saving ? 'Submitting...' : 'Submit for admin approval'}</Button>{message && <p className="mt-4 text-sm text-amber-200">{message}</p>}</div>
    </div>
  </section>
}
