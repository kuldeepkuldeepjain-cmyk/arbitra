'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'email' | 'otp' | 'done'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    if (step === 'email') {
      const { error: requestError } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: 'forget-password',
      })
      if (requestError) {
        setError('We could not send a reset code. Please check your email and try again.')
      } else {
        setStep('otp')
      }
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const { error: resetError } = await authClient.$fetch('/email-otp/reset-password', {
      method: 'POST',
      body: {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      },
    })
    if (resetError) {
      setError('That code is invalid or expired. Please request a new code.')
    } else {
      setStep('done')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#020914] px-4 py-10 text-white sm:py-16">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <Link href="/sign-in" className="mb-8 inline-flex items-center gap-2 text-sm text-[#8eafd9] hover:text-[#00c8ff]">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
        <div className="rounded-[24px] border border-[#078dff] bg-[#071426]/90 p-7 shadow-[0_0_70px_rgba(0,132,255,0.18)] backdrop-blur-xl sm:p-10">
          {step === 'done' ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-5 h-14 w-14 text-[#00c8ff]" />
              <h1 className="text-3xl font-bold">Password updated</h1>
              <p className="mt-3 text-sm leading-6 text-[#8eafd9]">Your password has been reset successfully.</p>
              <Link href="/sign-in" className="mt-7 inline-flex rounded-xl bg-[#00c8ff] px-6 py-3 text-sm font-semibold text-[#020914]">Continue to sign in</Link>
            </div>
          ) : (
            <>
              <ShieldCheck className="mb-5 h-9 w-9 text-[#00c8ff]" />
              <h1 className="text-3xl font-bold">Reset your password</h1>
              <p className="mt-2 text-sm leading-6 text-[#8eafd9]">We&apos;ll send a one-time 6-digit code from AlgoBot to verify your email.</p>
              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={step === 'otp'} autoComplete="email" />
                </div>
                {step === 'otp' && (
                  <>
                    <div className="rounded-xl border border-[#008dff] bg-[#061b35]/70 p-4 text-sm text-[#8eafd9]">A 6-digit code was sent to <span className="font-medium text-white">{email}</span>. It expires in 15 minutes.</div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="reset-otp">Verification code</Label>
                      <Input id="reset-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center font-mono text-2xl font-bold tracking-[0.35em]" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-password">New password</Label>
                      <Input id="new-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="confirm-password">Confirm new password</Label>
                      <Input id="confirm-password" type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
                    </div>
                  </>
                )}
                {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
                <button type="submit" disabled={loading || (step === 'otp' && otp.length !== 6)} className="flex items-center justify-center gap-2 rounded-xl bg-[#00c8ff] px-5 py-3.5 text-sm font-semibold text-[#020914] transition hover:bg-[#38d7ff] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Please wait...' : step === 'email' ? 'Send reset code' : 'Reset password'}
                </button>
                {step === 'otp' && <button type="button" disabled={loading} onClick={async () => { setError(''); const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: 'forget-password' }); if (resendError) setError('We could not resend the code. Please try again.') }} className="text-sm text-[#00c8ff] hover:underline">Resend code</button>}
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
