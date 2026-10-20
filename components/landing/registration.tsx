'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ShieldCheck, Loader2, Shield, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { registerWithCaptcha, saveRegistrationProfile } from '@/app/actions/secure-registration'
import { authClient } from '@/lib/auth-client'

// --- Math captcha helpers ---
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

export function Registration() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    password: '',
    confirmPassword: '',
    agree: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Captcha state — generated client-side only to avoid hydration mismatch
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState(false)

  const refreshChallenge = useCallback(() => {
    setChallenge(generateChallenge())
    setCaptchaAnswer('')
    setCaptchaError(false)
  }, [])

  // Generate initial challenge after mount (client-only)
  useEffect(() => {
    refreshChallenge()
  }, [refreshChallenge])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCaptchaError(false)

    // Client-side password match check
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    // Verify math captcha on the client first
    const userAnswer = parseInt(captchaAnswer.trim(), 10)
    if (!challenge || isNaN(userAnswer) || userAnswer !== challenge.answer) {
      setCaptchaError(true)
      refreshChallenge()
      setError('Incorrect captcha answer. A new challenge has been generated.')
      return
    }

    setLoading(true)

    try {
      if (otpStep) {
        const { error: otpError } = await authClient.emailOtp.verifyEmail({
          email: form.email.toLowerCase().trim(),
          otp: otp.trim(),
        })

        if (otpError) {
          setError('That code is invalid or expired. Please try again.')
          return
        }

        setOtpStep(false)
        setSubmitted(true)
        return
      }

      // Step 1: Pre-flight — captcha + rate limit + email uniqueness check
      const preflight = await registerWithCaptcha({
        email: form.email.toLowerCase(),
        captchaToken: 'math-captcha-passed',
      })

      if (!preflight.success) {
        setError(preflight.error || 'Registration failed. Please try again.')
        refreshChallenge()
        return
      }

      // Step 2: Create the account via Better Auth
      const { data, error: signUpError } = await authClient.signUp.email({
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
      })

      if (signUpError || !data?.user?.id) {
        setError(signUpError?.message ?? 'Account creation failed. Please try again.')
        refreshChallenge()
        return
      }

      // Step 3: Save extended profile fields (phone, country, experience)
      await saveRegistrationProfile({
        userId: data.user.id,
        phone: form.phone || undefined,
        country: form.country || undefined,
      })

      // Step 4: Ask for the code Better Auth sent through Resend
      setOtp('')
      setOtpStep(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      refreshChallenge()
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="pricing" className="relative min-h-screen overflow-hidden bg-[#020914] py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,137,255,0.18),transparent_34%),linear-gradient(115deg,rgba(2,9,20,0.98),rgba(2,13,28,0.88))]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(24,133,235,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(24,133,235,0.11)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-[70%] rounded-full bg-[#006dff]/20 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-8">
        <div className="mx-auto mb-10 flex max-w-xl justify-center lg:mb-12">
          <img src="/algobot-logo.png" alt="AlgoBot" className="h-10 w-auto object-contain sm:h-12" />
        </div>
        <div className="mx-auto max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="rounded-[24px] border border-[#078dff] bg-[#071426]/90 p-7 shadow-[0_0_70px_rgba(0,132,255,0.18)] backdrop-blur-xl sm:p-10">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#00FF99]/10 border border-[#00FF99]/30 flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-[#00FF99]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                  <p className="text-[#98A2B3] text-sm mb-2">
                    Your AlgoBot account is verified. You can now sign in with your email and password.
                  </p>
                  <p className="text-xs text-[#98A2B3]/60 mb-6">
                    Verify your email to securely continue to your AlgoBot dashboard.
                  </p>
                  <Link
                    href="/sign-in"
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#050816] bg-[#00D4FF] hover:bg-[#00D4FF]/90 transition-all"
                  >
                    Continue to Sign In
                  </Link>
                </div>
              ) : otpStep ? (
                <>
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10">
                    <ShieldCheck className="h-7 w-7 text-[#00D4FF]" />
                  </div>
                  <h3 className="text-center text-xl font-bold text-white mb-2">Verify your email</h3>
                  <p className="text-center text-sm text-[#98A2B3] mb-6">
                    Enter the 6-digit code sent to <span className="font-medium text-white">{form.email}</span>. The code is valid for 15 minutes.
                  </p>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      aria-label="6-digit email verification code"
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.35em] text-white placeholder-[#98A2B3]/40 focus:border-[#00D4FF]/40 focus:outline-none"
                    />
                    {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5" role="alert">{error}</p>}
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold text-[#050816] bg-[#00D4FF] hover:bg-[#00D4FF]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-[0_0_30px_rgba(0,212,255,0.35)] flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Verifying code...' : 'Verify and Create Account'}
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setError(null)
                        const { error: resendError } = await authClient.emailOtp.sendVerificationOtp({ email: form.email.toLowerCase().trim(), type: 'email-verification' })
                        if (resendError) setError('We could not resend the code. Please try again.')
                      }}
                      className="text-sm text-[#00D4FF] hover:underline disabled:opacity-60"
                    >
                      Resend code
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold tracking-tight text-white mb-2">Create Your <span className="text-[#00C8FF]">AlgoBot Trader</span> Account</h3>
                  <p className="text-sm text-[#8eafd9] mb-8">Enter your details to get started.</p>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-[#8eafd9]">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="John Smith"
                          className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-[#8eafd9]">Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+1 555 000 0000"
                          className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#8eafd9]">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-[#8eafd9]">State *</label>
                        <input
                          type="text"
                          required
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          placeholder="Maharashtra"
                          className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-[#8eafd9]">Password *</label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Min. 8 characters"
                          className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-[#8eafd9]">Confirm Password *</label>
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          placeholder="Repeat password"
                          className={`w-full px-4 py-2.5 text-sm rounded-xl bg-white/[0.04] border text-white placeholder-[#98A2B3]/50 focus:outline-none transition-colors ${
                            form.confirmPassword && form.confirmPassword !== form.password
                              ? 'border-red-500/50 focus:border-red-500/60'
                              : form.confirmPassword && form.confirmPassword === form.password
                              ? 'border-green-500/40 focus:border-green-500/50'
                              : 'border-white/[0.08] focus:border-[#00D4FF]/40'
                          }`}
                        />
                        {form.confirmPassword && form.confirmPassword !== form.password && (
                          <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                        )}
                      </div>
                    </div>

                    {/* Math Captcha */}
                    {challenge && (
                      <div className="rounded-2xl border border-[#008dff] bg-[#061b35]/70 p-5 shadow-[0_0_28px_rgba(0,132,255,0.12)]">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-[#00D4FF] shrink-0" />
                          <span className="text-xs font-semibold text-[#00D4FF] uppercase tracking-wide">Security Check</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-xs text-[#98A2B3] mb-2">Solve the equation to verify you&apos;re human:</p>
                            <div className="flex items-center gap-3">
                              {/* Math challenge display */}
                              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] select-none">
                                <span className="text-lg font-bold text-white font-mono tracking-widest">
                                  {challenge.question} =
                                </span>
                              </div>
                              {/* Answer input */}
                              <input
                                type="number"
                                required
                                value={captchaAnswer}
                                onChange={(e) => { setCaptchaAnswer(e.target.value); setCaptchaError(false) }}
                                placeholder="?"
                                className={`w-20 px-3 py-2.5 text-lg font-bold text-center rounded-xl border text-white placeholder-[#98A2B3]/50 focus:outline-none transition-colors bg-white/[0.04] ${
                                  captchaError
                                    ? 'border-red-500/60 bg-red-500/5'
                                    : captchaAnswer && !captchaError
                                    ? 'border-[#00D4FF]/40'
                                    : 'border-white/[0.08]'
                                }`}
                              />
                              {/* Refresh button */}
                              <button
                                type="button"
                                onClick={refreshChallenge}
                                className="p-2 rounded-lg text-[#98A2B3] hover:text-white hover:bg-white/[0.08] transition-colors"
                                title="New challenge"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                            {captchaError && (
                              <p className="text-xs text-red-400 mt-2">Wrong answer — a new challenge was generated.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={form.agree}
                          onChange={(e) => setForm({ ...form, agree: e.target.checked })}
                          className="mt-1 accent-[#00D4FF]"
                        />
                        <span className="text-xs text-[#98A2B3]">
                          I agree to the{' '}
                          <Link href="#" className="text-[#00D4FF] hover:underline">Terms of Service</Link>
                          {', '}
                          <Link href="#" className="text-[#00D4FF] hover:underline">Privacy Policy</Link>
                          {', and '}
                          <Link href="#" className="text-[#00D4FF] hover:underline">Risk Disclosure</Link>.
                          I understand this platform provides market intelligence only.
                        </span>
                      </label>
                    </div>

                    {error && (
                      <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5" role="alert">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl text-sm font-semibold text-[#050816] bg-[#00D4FF] hover:bg-[#00D4FF]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-[0_0_30px_rgba(0,212,255,0.35)] hover:shadow-[0_0_50px_rgba(0,212,255,0.55)] flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Creating account...' : 'Create Account  →'}
                    </button>

                    <div className="flex items-center gap-4 pt-2">
                      <span className="h-px flex-1 bg-[#24415f]" />
                      <p className="text-center text-xs text-[#8eafd9]">Already have an account?{' '}<Link href="/sign-in" className="text-[#00C8FF] hover:underline">Sign in</Link></p>
                      <span className="h-px flex-1 bg-[#24415f]" />
                    </div>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
