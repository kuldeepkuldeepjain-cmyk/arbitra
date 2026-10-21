'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { getActivationStatus, submitActivationFee } from '@/app/actions/referral'
import { getActiveBotActivationPlans, getActivationPaymentMethods } from '@/app/actions/activation-payment-methods'
import {
  Shield, Clock, CheckCircle2, XCircle,
  ChevronRight, AlertTriangle, Wallet, X, RefreshCw, LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { CopyButton as CopyBtn } from '@/lib/trader-utils'

type DepositAddress = {
  id: number
  network: string
  address: string
  label: string | null
  isActive: boolean
}

type ActivationStatus = Awaited<ReturnType<typeof getActivationStatus>>
type PaymentMethod = Awaited<ReturnType<typeof getActivationPaymentMethods>>[number]

const NETWORK_META: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  TRC20: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    badge: 'TRON' },
  BEP20: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', badge: 'BNB Chain' },
  ERC20: { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   badge: 'Ethereum' },
}



const GRACE_PERIOD_DAYS = 7
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000

export function ActivationFeeModal({ serverIsActivated, createdAt }: { serverIsActivated: boolean; createdAt: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<ActivationStatus | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [plans, setPlans] = useState<Array<{ id: number; name: string; durationMonths: number; priceInr: string; description: string | null }>>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const registeredAt = new Date(createdAt).getTime()
  const msSinceRegistration = Date.now() - registeredAt
  const inGracePeriod = msSinceRegistration < GRACE_PERIOD_MS

  const handleSignOut = async () => {
    setSigningOut(true)
    await authClient.signOut()
    router.push('/sign-in')
  }

  // Form state
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [txHash, setTxHash] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!txHash.trim()) return
    if (!selectedMethod) { setSubmitError('Please select a payment method first.'); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitActivationFee(txHash.trim(), selectedAmount, { paymentMethod: selectedMethod ?? undefined, network: isCryptoPayment ? selectedPaymentMethod?.label : 'UPI', planId: selectedPlanId ?? undefined })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    // If the server already confirmed activated, or the 7-day grace period
    // hasn't elapsed yet, skip the async fetch entirely — nothing to show.
    if (serverIsActivated || inGracePeriod) return
    load()
  }, [serverIsActivated, inGracePeriod])

  const load = async () => {
    setLoading(true)
    try {
      const [data, methods, loadedPlans] = await Promise.all([getActivationStatus(), getActivationPaymentMethods(), getActiveBotActivationPlans()])
      setStatus(data)
      setPaymentMethods(methods)
      setPlans(loadedPlans)
      setSelectedPlanId(loadedPlans[0]?.id ?? 1)
      setSelectedMethod(methods.find((method) => method.upiId)?.method ?? methods[0]?.method ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const selectedAmount = Number(plans.find(plan => plan.id === selectedPlanId)?.priceInr ?? (selectedPlanId === 2 ? 1999 : selectedPlanId === 3 ? 2999 : selectedPlanId === 4 ? 4999 : 999))
  const selectedPaymentMethod = paymentMethods.find((method) => method.method === selectedMethod)
  const cryptoAmount = selectedAmount === 999 ? 10 : selectedAmount === 1999 ? 20 : selectedAmount === 2999 ? 30 : selectedAmount === 4999 ? 50 : Math.ceil(selectedAmount / 100)
  const isCryptoPayment = selectedPaymentMethod?.currency === 'USDT'

  useEffect(() => {
    let cancelled = false
    const upiId = selectedPaymentMethod?.upiId
    if (!upiId || !selectedAmount) {
      setQrDataUrl(null)
      return
    }
    QRCode.toDataURL(`upi://pay?pa=${encodeURIComponent(upiId)}&pn=AlgoBot&am=${selectedAmount.toFixed(2)}&cu=INR`, {
      width: 220,
      margin: 2,
      color: { dark: '#081426', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then((url) => { if (!cancelled) setQrDataUrl(url) }).catch(() => { if (!cancelled) setQrDataUrl(null) })
    return () => { cancelled = true }
  }, [selectedPaymentMethod?.upiId, selectedAmount])

  // Never show for already-activated traders (server-authoritative check)
  if (serverIsActivated) return null

  // Full unrestricted access for the first 7 days after registration —
  // no activation prompts at all during the grace period.
  if (inGracePeriod) return null

  // Don't show while loading
  if (loading) return null

  // Don't show if the fresh DB check also confirms activation
  if (status?.isActivated) return null

  // If dismissed after a pending submission, allow dashboard use
  if (dismissed) return null

  const hasPending  = status?.latestFee?.status === 'pending'
  const hasRejected = status?.latestFee?.status === 'rejected'
  const addresses   = status?.depositAddresses ?? []
  const noAddresses = paymentMethods.length === 0
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        {/* Top-right controls — sign out is always available; dismiss when pending */}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          {(hasPending || submitted) && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              title="Continue to dashboard"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs font-medium disabled:opacity-50"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Account Activation Required</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Your {GRACE_PERIOD_DAYS}-day free trial has ended — activate your Algo Bot plan with INR payment
              </p>
            </div>
          </div>
        </div>

        {/* Fee badge */}
        <div className="mx-6 mb-5 flex items-center gap-4 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Activation Fee</p>
            <p className="text-amber-400 font-black text-3xl font-mono leading-tight">{isCryptoPayment ? `${cryptoAmount} USDT` : `₹${selectedAmount.toLocaleString('en-IN')}`} <span className="text-base font-semibold text-slate-400">selected plan</span></p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-slate-500 text-xs">Multi-Level Referral Plan</p>
            <div className="mt-1 space-y-0.5">
              {[['L1 Direct', '$30'], ['L2', '$10'], ['L3', '$5']].map(([lv, amt]) => (
                <div key={lv} className="flex items-center gap-2 justify-end">
                  <span className="text-slate-500 text-xs">{lv}</span>
                  <span className="text-green-400 text-xs font-bold">{amt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* ── PENDING STATE ── */}
          {(hasPending || submitted) && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-semibold text-sm">Payment Under Review</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Your activation fee has been submitted and is awaiting admin confirmation.
                  You can continue using the dashboard — your account will be fully activated once approved.
                </p>
                {status?.latestFee?.txHash && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <code className="text-slate-400 text-xs font-mono bg-slate-800 px-2 py-0.5 rounded truncate max-w-[260px]">
                      {status.latestFee.txHash}
                    </code>
                    <CopyBtn text={status.latestFee.txHash} />
                  </div>
                )}
                <Button
                  onClick={() => setDismissed(true)}
                  className="mt-3 h-8 px-4 text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1.5"
                >
                  Continue to Dashboard <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ── REJECTED STATE ── */}
          {hasRejected && !submitted && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold text-sm">Previous Submission Rejected</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {status?.latestFee?.note
                    ? `Reason: ${status.latestFee.note}`
                    : 'Your previous submission was not confirmed. Please re-submit with the correct transaction hash.'}
                </p>
              </div>
            </div>
          )}

          {/* ── SUBMISSION FORM (shown when not pending/submitted) ── */}
          {!hasPending && !submitted && (
            <>
              {noAddresses ? (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-center gap-3 text-slate-400 text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  Deposit addresses are being configured by the admin. Please check back shortly.
                </div>
              ) : (
                <>
                  {/* Step 1 — Choose network */}
                  <div>
                    <p className="text-slate-300 text-sm font-semibold mb-2.5 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">1</span>
                      Choose a plan and payment method
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {(plans.length ? plans : [
                        { id: 1, name: '1 Month', durationMonths: 1, priceInr: '999', description: 'Starter access' },
                        { id: 2, name: '3 Months', durationMonths: 3, priceInr: '1999', description: 'Quarterly access' },
                        { id: 3, name: '6 Months', durationMonths: 6, priceInr: '2999', description: 'Popular plan' },
                        { id: 4, name: '12 Months', durationMonths: 12, priceInr: '4999', description: 'Annual value' },
                      ]).map(plan => (
                        <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)} className={`rounded-xl border p-3 text-left transition ${selectedPlanId === plan.id ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/40' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}>
                          <span className="block text-xs font-semibold text-slate-300">{plan.name}</span>
                          <span className="mt-1 block text-lg font-black text-amber-300">₹{Number(plan.priceInr).toLocaleString('en-IN')}</span>
                          <span className="block text-[10px] text-slate-500">{plan.description}</span>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {paymentMethods.map((method) => {
                        const isSelected = selectedMethod === method.method
                        return (
                          <div
                            key={method.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedMethod(method.method)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setSelectedMethod(method.method)
                              }
                            }}
                            className={`w-full text-left rounded-xl border px-4 py-3 transition-all cursor-pointer ${
                              isSelected ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="px-2 py-0.5 rounded-md text-xs font-bold border bg-amber-500/10 text-amber-300 border-amber-500/30">
                                {method.label}
                              </div>
                              <div className="flex-1 min-w-0">
                                {method.currency === 'USDT' && method.walletAddress && <div className="flex items-center gap-1"><p className="text-slate-300 text-xs font-mono truncate">{method.walletAddress}</p><CopyBtn text={method.walletAddress} size="sm" /></div>}
                                {method.currency !== 'USDT' && method.upiId && <p className="text-slate-300 text-xs font-mono truncate">UPI: {method.upiId}</p>}
                                {method.instructions && <p className="text-slate-500 text-xs">{method.instructions}</p>}
                              </div>
                              {method.upiId && (
                                <div onClick={(event) => event.stopPropagation()} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/70 px-1.5 py-1">
                                  <span className="hidden text-[10px] font-medium text-slate-400 sm:inline">Copy UPI</span>
                                  <CopyBtn text={method.upiId} size="sm" />
                                </div>
                              )}
                              {method.upiId && isSelected && qrDataUrl ? (
                                <img src={qrDataUrl} alt={`QR code to pay ₹${selectedAmount.toLocaleString('en-IN')} to ${method.label}`} className="h-24 w-24 shrink-0 rounded-lg bg-white object-contain p-1 shadow-lg" />
                              ) : method.qrImageUrl ? (
                                <img src={method.qrImageUrl} alt={`${method.label} INR payment QR code`} className="h-24 w-24 shrink-0 rounded-lg bg-white object-contain p-1 opacity-70" />
                              ) : isSelected ? (
                                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-amber-500/40 text-center text-[10px] text-amber-300">UPI ID required for QR</div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Step 2 — TX Hash */}
                  <div>
                    <p className="text-slate-300 text-sm font-semibold mb-2.5 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">2</span>
                      {isCryptoPayment ? `Send ${cryptoAmount} USDT, then paste the transaction hash` : 'Pay in INR, then paste the UTR / transaction reference'}
                    </p>
                    <div className="relative">
                      <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        type="text"
                        value={txHash}
                        onChange={e => { setTxHash(e.target.value); setSubmitError(null) }}
                        placeholder={isCryptoPayment ? 'e.g. 0x... or blockchain transaction hash' : 'e.g. UPI123456789 or bank reference'}
                        className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 text-sm font-mono focus:outline-none transition-colors"
                      />
                    </div>
                    <p className="text-slate-600 text-xs mt-1.5 ml-0.5">
                      Paste the full transaction hash from your wallet after sending.
                    </p>
                  </div>

                  {/* Error */}
                  {submitError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {submitError}
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !txHash || typeof txHash !== 'string' || !txHash.trim()}
                    className="w-full h-11 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Activation Fee
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          )}

          {/* Info note */}
          {!hasPending && !submitted && (
            <p className="text-slate-600 text-xs text-center leading-relaxed">
              Your Algo Bot access will be activated within 24 hours after admin confirmation.
              Contact support if you have any issues.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
