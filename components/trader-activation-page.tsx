'use client'

import { useEffect, useState } from 'react'
import { BadgeIndianRupee, CheckCircle2, ClipboardCheck, Copy, CreditCard, LockKeyhole, QrCode, ShieldCheck, Smartphone, WalletCards } from 'lucide-react'
import { getActiveBotActivationPlans, getActivationPaymentMethods } from '@/app/actions/activation-payment-methods'
import { submitActivationFee } from '@/app/actions/referral'
import { Button } from '@/components/ui/button'

type Plan = { id: number; name: string; durationMonths: number; priceInr: string; description: string | null }
type Method = { id: number; method: string; label: string; currency: string; upiId: string | null; walletAddress: string | null; qrImageUrl: string | null; instructions: string | null }

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
  const isCrypto = selectedMethod?.currency === 'USDT'
  const usdtAmount = Number(selectedPlan.priceInr) === 999 ? 10 : Number(selectedPlan.priceInr) === 1999 ? 20 : Number(selectedPlan.priceInr) === 2999 ? 30 : Number(selectedPlan.priceInr) === 4999 ? 50 : Math.ceil(Number(selectedPlan.priceInr) / 100)

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
    try { await submitActivationFee(utr.trim(), Number(selectedPlan.priceInr), { paymentMethod: selectedMethod?.method, network: isCrypto ? selectedMethod?.label : 'UPI', planId: selectedPlan.id }); setMessage('Payment submitted. Admin will review your activation shortly.'); setUtr('') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Payment submission failed.') }
    finally { setSaving(false) }
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <div className="overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950">
      <div className="flex items-start justify-between gap-4 p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-400/15 p-3"><ShieldCheck className="h-6 w-6 text-amber-300" /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Secure activation checkout</p><h1 className="mt-1 text-2xl font-black text-white">Activate your Algo Bot</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Choose a plan, pay through INR UPI or USDT on TRC20, BEP20, or ERC20, then submit your payment reference for manual Admin verification.</p></div></div><div className="hidden items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-emerald-300 sm:flex"><LockKeyhole className="h-4 w-4" /> Secure manual review</div></div>
      <div className="grid grid-cols-3 border-t border-slate-800/80 bg-slate-950/30"><div className="flex items-center justify-center gap-2 px-3 py-3 text-[10px] font-semibold text-slate-400"><BadgeIndianRupee className="h-4 w-4 text-amber-300" /> INR + USDT pricing</div><div className="flex items-center justify-center gap-2 border-x border-slate-800/80 px-3 py-3 text-[10px] font-semibold text-slate-400"><ClipboardCheck className="h-4 w-4 text-amber-300" /> Admin verified</div><div className="flex items-center justify-center gap-2 px-3 py-3 text-[10px] font-semibold text-slate-400"><ShieldCheck className="h-4 w-4 text-amber-300" /> Secure review</div></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{plans.map(plan => <button key={plan.id} onClick={() => setSelectedPlan(plan)} className={`rounded-2xl border p-5 text-left transition ${selectedPlan.id === plan.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{plan.name}</p><p className="mt-2 text-2xl font-black text-white">₹{Number(plan.priceInr).toLocaleString('en-IN')}</p><p className="mt-2 text-xs text-slate-500">{plan.description}</p>{selectedPlan.id === plan.id && <CheckCircle2 className="mt-4 h-5 w-5 text-amber-300" />}</button>)}</div>
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-300" /><div><h2 className="font-bold text-white">Choose payment method</h2><p className="mt-0.5 text-[11px] text-slate-500">Pay exactly the amount shown below</p></div></div><span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">{isCrypto ? 'USDT' : 'INR'}</span></div><div className="mt-4 space-y-3">{methods.length ? methods.map(method => <button key={method.id} onClick={() => setSelectedMethod(method)} className={`w-full rounded-xl border p-4 text-left ${selectedMethod?.id === method.id ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-950/50'}`}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-amber-300" /><p className="font-semibold text-white">{method.label}</p><span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">{method.currency}</span></div>{method.currency === 'USDT' && method.walletAddress && <div className="mt-2 flex items-center gap-2"><p className="truncate text-xs font-mono text-amber-300">{method.walletAddress}</p><button type="button" aria-label="Copy wallet address" onClick={event => { event.stopPropagation(); navigator.clipboard.writeText(method.walletAddress ?? '') }} className="shrink-0 rounded border border-slate-700 p-1 text-slate-400 hover:text-white"><Copy className="h-3 w-3" /></button></div>}{method.currency !== 'USDT' && method.upiId && <p className="mt-1 text-sm text-amber-300">{method.upiId}</p>}{method.instructions && <p className="mt-2 text-xs text-slate-500">{method.instructions}</p>}</div>{method.currency !== 'USDT' && method.qrImageUrl && <img src={method.qrImageUrl} alt={`${method.label} INR payment QR code`} className="h-28 w-28 shrink-0 rounded-lg bg-white object-contain p-1" />}</div></button>) : <p className="text-sm text-slate-500">Payment options will appear when configured by admin.</p>}</div></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-amber-300" /><div><h2 className="font-bold text-white">Complete payment</h2><p className="mt-0.5 text-[11px] text-slate-500">Finish with your UPI app, then verify your payment</p></div></div><div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount payable</p><p className="mt-1 text-3xl font-black text-amber-300">{isCrypto ? `${usdtAmount} USDT` : `₹${Number(selectedPlan.priceInr).toLocaleString('en-IN')}`}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wide text-slate-500">Selected plan</p><p className="mt-1 text-sm font-bold text-white">{selectedPlan.name}</p></div></div></div><div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-950/60 p-3 text-xs text-slate-400"><QrCode className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><span>{isCrypto ? `Send exactly ${usdtAmount} USDT on ${selectedMethod?.label} to the wallet above, then paste the blockchain transaction hash.` : 'Scan the QR or use the UPI ID above. Payments are reviewed manually by Admin for account security.'}</span></div><input value={utr} onChange={e => setUtr(e.target.value)} placeholder={isCrypto ? 'Enter blockchain transaction hash' : 'Enter UTR / transaction reference'} className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-amber-400" /><Button onClick={submit} disabled={saving || !selectedMethod} className="mt-3 w-full bg-amber-500 font-bold text-slate-950 shadow-lg shadow-amber-950/30 hover:bg-amber-400">{saving ? 'Submitting securely...' : 'Submit payment for approval'}</Button><p className="mt-3 text-center text-[10px] text-slate-600">By submitting, you confirm the payment reference is genuine.</p>{message && <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-200">{message}</p>}</div>
    </div>
  </section>
}
