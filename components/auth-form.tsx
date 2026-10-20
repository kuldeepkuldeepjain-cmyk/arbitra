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
import { RefreshCw, Shield, ArrowLeft } from 'lucide-react'

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
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password')
  const [referralCode, setReferralCode] = useState('')
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [referralChecking, setReferralChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

      const { error: otpError } = await authClient.emailOtp.sendVerificationOtp({
        email: email.toLowerCase(),
        type: 'email-verification',
      })
      if (otpError) {
        setError('Account created, but we could not send the verification code. Please try again.')
        setLoading(false)
        return
      }
      setOtpSent(true)
      setLoading(false)
      // Step 3 — Save extra profile fields via server action
      if (signUpData?.user?.id) {
        try {
          const { saveRegistrationProfile } = await import('@/app/actions/secure-registration')
          await saveRegistrationProfile({ userId: signUpData.user.id })
        } catch { /* non-fatal */ }
      }

      // Step 4 — Store referral association
      if (referralCode && referralValid) {
        try {
          const { storeReferredBy } = await import('@/app/actions/users')
          await storeReferredBy(referralCode)
        } catch { /* non-fatal */ }
      }
    } else {
      if (loginMethod === 'otp') {
        const { error: otpSendError } = await authClient.emailOtp.sendVerificationOtp({
          email: email.toLowerCase(),
          type: 'sign-in',
        })
        if (otpSendError) {
          setError('Unable to send a verification code. Please try again.')
          setLoading(false)
          return
        }
        setOtpSent(true)
        setLoading(false)
        return
      }

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

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Home
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {otpSent ? 'Enter your email code' : isSignUp ? 'Create an account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {otpSent
              ? `We sent a 6-digit verification code to ${email}`
              : isSignUp
                ? 'Sign up to get started'
                : loginMethod === 'otp' ? 'Sign in securely with a one-time email code' : 'Sign in with your email and password'}
          </p>
        </div>

        {!isSignUp && !otpSent && (
          <div className="mb-4 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm">
            <button type="button" onClick={() => { setLoginMethod('password'); setError(null) }} className={`rounded-md px-3 py-2 transition-colors ${loginMethod === 'password' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Email &amp; Password</button>
            <button type="button" onClick={() => { setLoginMethod('otp'); setError(null) }} className={`rounded-md px-3 py-2 transition-colors ${loginMethod === 'otp' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>Email Code</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {otpSent ? (
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
              {(isSignUp || loginMethod === 'password') && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">{isSignUp ? 'Create password' : 'Password'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isSignUp ? 8 : undefined}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                </div>
              )}
              {!isSignUp && loginMethod === 'password' && (
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


          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? 'Please wait...'
              : otpSent
                ? 'Verify code'
                : isSignUp
              ? 'Send verification code'
              : loginMethod === 'otp'
                ? 'Send sign-in code'
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
