'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, MailCheck, ShieldCheck } from 'lucide-react'
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
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-8">
      <div className="flex w-full max-w-sm flex-col justify-center">
        <Link href="/sign-in" className="group mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to sign in
        </Link>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-7">
          {step === 'done' ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-5 size-12 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Password updated</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Your password has been reset successfully.</p>
              <Link href="/sign-in" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Continue to sign in</Link>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-3">
                <img src="/algobot-logo.png" alt="AlgoBot" className="size-12 rounded-xl object-contain" />
                <div><p className="text-sm font-bold tracking-tight text-foreground">AlgoBot</p><p className="text-xs text-muted-foreground">Secure account recovery</p></div>
              </div>
              <ShieldCheck className="mb-4 size-8 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset your password</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">We&apos;ll send a one-time 6-digit code from AlgoBot to verify your email.</p>
              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input id="reset-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={step === 'otp'} autoComplete="email" />
                </div>
                {step === 'otp' && (
                  <>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground"><MailCheck className="mt-0.5 size-4 shrink-0 text-primary" /><span>A 6-digit code was sent to <span className="font-medium text-foreground">{email}</span>. It expires in 15 minutes.</span></div>
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
                {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
                <button type="submit" disabled={loading || (step === 'otp' && otp.length !== 6)} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
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
