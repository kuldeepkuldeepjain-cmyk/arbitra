'use client'

// Force rebuild with new chunk hash - fixes ChunkLoadError
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { RefreshCw, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react'

// Server actions are imported dynamically inside event handlers to avoid bundling them on the client

// ── Math captcha helpers ─────────────────────────────────────────────────────
type CaptchaChallenge = { question: string; answer: number }

function generateChallenge(): CaptchaChallenge {
  const ops = ['+', '-', '*'] as const
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a: number, b: number, answer: number, question: string
  if (op === '+') {
    a = Math.floor(Math.random() * 20) + 1
    b = Math.floor(Math.random() * 20) + 1
    answer = a + b
    question = `${a} + ${b}`
  } else if (op === '-') {
    a = Math.floor(Math.random() * 20) + 10
    b = Math.floor(Math.random() * a) + 1
    answer = a - b
    question = `${a} - ${b}`
  } else {
    a = Math.floor(Math.random() * 9) + 2
    b = Math.floor(Math.random() * 9) + 2
    answer = a * b
    question = `${a} × ${b}`
  }
  return { question, answer }
}

function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [referralChecking, setReferralChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  // Math captcha — generated client-side only to avoid SSR hydration mismatch
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState(false)

  const refreshChallenge = useCallback(() => {
    setChallenge(generateChallenge())
    setCaptchaAnswer('')
    setCaptchaError(false)
  }, [])

  const isSignUp = mode === 'sign-up'

  // Generate initial captcha challenge after mount (client-only)
  useEffect(() => {
    if (isSignUp) refreshChallenge()
  }, [isSignUp, refreshChallenge])

  // Pre-fill referral code from URL param e.g. /sign-up?ref=ABCD1234
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  // Validate referral code with debounce
  useEffect(() => {
    if (!referralCode || referralCode.length < 6) {
      setReferralValid(null)
      return
    }
    const timer = setTimeout(async () => {
      setReferralChecking(true)
      const { validateReferralCode } = await import('@/app/actions/referral')
      const referrerId = await validateReferralCode(referralCode)
      setReferralValid(referrerId !== null)
      setReferralChecking(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [referralCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setCaptchaError(false)

    // ── Sign-up: verify captcha before anything else ────────────────────────
    if (isSignUp) {
      const userAnswer = parseInt(captchaAnswer.trim(), 10)
      if (!challenge || isNaN(userAnswer) || userAnswer !== challenge.answer) {
        setCaptchaError(true)
        refreshChallenge()
        setError('Incorrect security answer. A new challenge has been generated.')
        return
      }
    }

    setLoading(true)

    if (otpSent) {
      const { data, error: otpError } = await authClient.emailOtp.verifyEmail({
        email: email.toLowerCase(),
        otp: otp.trim(),
      })
      if (otpError) {
        setError('That verification code is invalid or expired.')
        setLoading(false)
        return
      }
      if (data?.status) {
        window.location.href = '/trader'
      }
      return
    }

    if (isSignUp) {
      // Step 1 — Server pre-flight: captcha + rate limit + email uniqueness check
      const { registerWithCaptcha } = await import('@/app/actions/secure-registration')
      const preflightResult = await registerWithCaptcha({
        email: email.toLowerCase(),
        captchaToken: 'math-captcha-passed',
      })
      if (!preflightResult.success) {
        setError(preflightResult.error ?? 'Something went wrong')
        refreshChallenge()
        setLoading(false)
        return
      }

      // Step 2 — Let Better Auth create the account (it hashes the password correctly)
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email: email.toLowerCase(),
        password,
        name,
      })
      if (signUpError) {
        setError(signUpError.message ?? 'Account creation failed.')
        refreshChallenge()
        setLoading(false)
        return
      }

      // Step 3 — Save extra profile fields via server action
      if (signUpData?.user?.id) {
        try {
          const { saveRegistrationProfile } = await import('@/app/actions/secure-registration')
          await saveRegistrationProfile({})
        } catch { /* non-fatal */ }
      }

      // Step 4 — Store referral association
      if (referralCode && referralValid) {
        try {
          const { storeReferredBy } = await import('@/app/actions/users')
          await storeReferredBy(referralCode)
        } catch { /* non-fatal */ }
      }
      setLoading(false)
      setOtpSent(true)
      setSuccessMessage(`Verification code sent successfully to ${email}. Enter the code below to complete your account.`)
      return
    } else {
      const { data: signInData, error } = await authClient.signIn.email({
        email: email.toLowerCase(),
        password,
      })
      if (error) {
        setError('Invalid email or password.')
        setLoading(false)
        return
      }
      if (!signInData?.user) {
        setError('Unable to complete sign in.')
        setLoading(false)
        return
      }

      // Fire-and-forget: record login IP without blocking the redirect
      const userId = signInData?.user?.id
      if (userId) {
        import('@/app/actions/user-session').then(mod => mod.recordUserLogin(userId)).catch(() => {/* non-fatal */})
      }

      // Redirect immediately using the role from the signIn response
      const role = (signInData?.user as unknown as { role?: string })?.role ?? 'viewer'
      const dest = role === 'admin' ? '/admin' : role === 'protrader' ? '/protrader' : role === 'trader' ? '/trader' : '/viewer'
      window.location.href = dest
      return
    }

    setLoading(false)

    // Sign-up flow: get session then redirect
    const session = await authClient.getSession()
    const role = (session?.data?.user as unknown as { role?: string })?.role ?? 'viewer'
    const dest = role === 'admin' ? '/admin' : role === 'protrader' ? '/protrader' : role === 'trader' ? '/trader' : '/viewer'
    window.location.href = dest
  }

  const resendOtp = async () => {
    setError(null)
    setResending(true)
    const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({
      email: email.toLowerCase(),
      type: isSignUp ? 'email-verification' : 'sign-in',
    })
    if (resendError) setError(resendError.message ?? 'Unable to resend the verification code.')
    else setSuccessMessage(`A new verification code was sent to ${email}.`)
    setResending(false)
  }

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </Link>
          <div className="mb-5 flex items-center gap-3">
            <img src="/algobot-logo.png" alt="AlgoBot" className="size-12 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">AlgoBot</p>
              <p className="text-xs text-muted-foreground">Algorithmic trading intelligence</p>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {otpSent ? 'Enter your email code' : isSignUp ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {otpSent
              ? `We sent a 6-digit verification code to ${email}`
              : isSignUp
                ? 'Sign up to get started'
                : 'Sign in with your email and password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {otpSent ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
                <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
                <div><p className="text-sm font-medium text-foreground">Check your inbox</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Enter the 6-digit code we sent to {email}. It expires in 15 minutes.</p></div>
              </div>
              <div className="flex flex-col gap-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\\D/g, '').slice(0, 6))}
                required
                autoFocus
                className="text-center text-2xl font-bold tracking-[0.45em]"
              />
              </div>
            </div>
          ) : isSignUp ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              {/* Referral code */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="referralCode">
                  Referral Code{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="referralCode"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC12345"
                    maxLength={12}
                    className={`pr-8 font-mono tracking-widest uppercase ${
                      referralValid === true
                        ? 'border-green-500 focus-visible:ring-green-500'
                        : referralValid === false
                        ? 'border-red-400 focus-visible:ring-red-400'
                        : ''
                    }`}
                  />
                  {referralCode.length >= 6 && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm">
                      {referralChecking ? (
                        <span className="text-muted-foreground animate-pulse">...</span>
                      ) : referralValid === true ? (
                        <span className="text-green-500">&#10003;</span>
                      ) : referralValid === false ? (
                        <span className="text-red-400">&#10007;</span>
                      ) : null}
                    </span>
                  )}
                </div>
                {referralValid === true && (
                  <p className="text-xs text-green-600">Valid referral code applied.</p>
                )}
                {referralValid === false && referralCode.length >= 6 && (
                  <p className="text-xs text-red-500">Referral code not found.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {(
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">{isSignUp ? 'Create password' : 'Password'}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={isSignUp ? 8 : undefined}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className="pr-10"
                    />
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {!isSignUp && (
                <div className="-mt-2 text-right">
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
              )}
            </>
          )}

          {!otpSent && isSignUp && challenge && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-semibold uppercase tracking-wide">Security Check</span></div>
              <p className="text-xs text-muted-foreground">Solve the equation to prove you&apos;re human:</p>
              <div className="flex items-center gap-3"><div className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg bg-background border border-border select-none"><span className="text-base font-bold font-mono tracking-widest">{challenge.question} = ?</span></div><Input type="number" value={captchaAnswer} onChange={(e) => { setCaptchaAnswer(e.target.value); setCaptchaError(false) }} placeholder="0" className={`w-20 text-center font-bold text-base font-mono ${captchaError ? 'border-destructive' : ''}`} required /><button type="button" onClick={refreshChallenge} className="p-2 rounded-lg text-muted-foreground hover:text-foreground" title="New challenge"><RefreshCw className="w-3.5 h-3.5" /></button></div>
              {captchaError && <p className="text-xs text-destructive">Wrong answer — a new challenge has been generated.</p>}
            </div>
          )}


          {successMessage && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300" role="status">
              {successMessage}
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {otpSent && (
            <button type="button" onClick={resendOtp} disabled={resending || loading} className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50">
              {resending ? 'Sending a new code…' : 'Resend verification code'}
            </button>
          )}

          <Button type="submit" disabled={loading || resending} className="w-full">
            {loading
              ? 'Please wait...'
              : otpSent
                ? 'Verify code'
                : isSignUp
              ? 'Send verification code'
              : 'Sign in'}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <Link
            href={isSignUp ? '/sign-in' : '/sign-up'}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </Card>
    </main>
  )
}

export default AuthForm
