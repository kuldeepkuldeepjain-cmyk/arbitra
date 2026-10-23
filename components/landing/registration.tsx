'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ShieldCheck, Loader2, Shield, RefreshCw, Eye, EyeOff, Activity, TrendingUp } from 'lucide-react'
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

const countryOptions = [
  { name: 'India', code: '+91' },
  { name: 'United States', code: '+1' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Australia', code: '+61' },
  { name: 'Canada', code: '+1' },
  { name: 'Singapore', code: '+65' },
  { name: 'United Arab Emirates', code: '+971' },
  { name: 'Germany', code: '+49' },
  { name: 'France', code: '+33' },
  { name: 'Japan', code: '+81' },
] as const

export function Registration() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'India',
    password: '',
    confirmPassword: '',
    referralCode: '',
    agree: false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

        const { error: signInError } = await authClient.signIn.email({
          email: form.email.toLowerCase().trim(),
          password: form.password,
        })
        if (signInError) {
          setError('Email verified. Please sign in to continue.')
          setOtpStep(false)
          return
        }

        await saveRegistrationProfile({
          phone: form.phone || undefined,
          country: form.country || undefined,
        })
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
        name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
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
        phone: form.phone || undefined,
        country: form.country || undefined,
      })

      setSubmitted(true)
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
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block"
          >
            <div className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#00C8FF]">
              <Activity className="h-4 w-4" />
              Institutional-grade workspace
            </div>
            <h2 className="max-w-lg text-5xl font-bold leading-[1.02] tracking-tight text-white">Automate your trading. <span className="text-[#00C8FF]">Stay in control.</span></h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[#9bb7d9]">Create your account to explore algorithmic trading tools, monitor strategies, and manage your trading workspace.</p>
            <div className="mt-10 rounded-2xl border border-[#1e426b] bg-[#071426]/80 p-5 shadow-[0_0_40px_rgba(0,110,255,0.12)]">
              <div className="mb-5 flex items-center justify-between">
                <div><p className="text-xs text-[#7894b8]">Strategy monitor</p><p className="mt-1 text-sm font-semibold text-white">Momentum Alpha</p></div>
                <span className="flex items-center gap-1.5 text-xs text-[#4ade80]"><span className="h-2 w-2 rounded-full bg-[#4ade80]" /> Active</span>
              </div>
              <div className="flex h-32 items-end gap-2 border-b border-[#1e426b] px-1">
                {[28, 42, 34, 58, 47, 72, 64, 88, 76, 102, 94, 120].map((height, index) => <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-[#0865da] to-[#00C8FF] opacity-80" style={{ height }} />)}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#7894b8]"><TrendingUp className="h-4 w-4 text-[#00C8FF]" /> Live demo data</span><span className="text-[#4ade80]">+12.48%</span></div>
            </div>
            <div className="mt-5 flex items-center gap-3 text-xs text-[#7894b8]"><ShieldCheck className="h-4 w-4 text-[#00C8FF]" /> Your account details are encrypted and protected.</div>
          </motion.div>
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
                    Your account has been created. You can now sign in securely.
                  </p>
                  <p className="text-xs text-[#98A2B3]/60 mb-6">
                    Your profile and registration details have been saved to your account.
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
                        if (resendError) setError(resendError.message ?? 'We could not resend the code. Please try again.')
                      }}
                      className="text-sm text-[#00D4FF] hover:underline disabled:opacity-60"
                    >
                      Resend code
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#00bfff]/30 bg-[#00bfff]/10">
                      <ShieldCheck className="h-5 w-5 text-[#00C8FF]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00C8FF]">Secure registration</p>
                      <p className="mt-1 text-xs text-[#8eafd9]">Create your AlgoBot Trader account</p>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight text-white mb-2">Create your account</h3>
                  <p className="text-sm text-[#8eafd9] mb-8">Set up your secure trading profile in a few simple steps.</p>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="first-name" className="mb-2 block text-xs font-medium text-[#8eafd9]">First name *</label>
                        <input
                          id="first-name"
                          type="text"
                          required
                          autoComplete="given-name"
                          value={form.firstName}
                          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                          placeholder="John"
                          className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                        />
                      </div>
                      <div>
                        <label htmlFor="last-name" className="mb-2 block text-xs font-medium text-[#8eafd9]">Last name *</label>
                        <input
                          id="last-name"
                          type="text"
                          required
                          autoComplete="family-name"
                          value={form.lastName}
                          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                          placeholder="Smith"
                          className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                        />
                      </div>
                    </div>

                    <div>
                          <label htmlFor="mobile-number" className="mb-2 block text-xs font-medium text-[#8eafd9]">Mobile Number *</label>
                          <div className="flex rounded-xl border border-[#264467] bg-[#0b1a31]/80 transition-colors focus-within:border-[#00C8FF] focus-within:ring-1 focus-within:ring-[#00C8FF]/40">
                            <span className="flex items-center border-r border-[#264467] px-3 text-sm font-medium text-[#00C8FF]" aria-label={`Country calling code for ${form.country}`}>
                              {countryOptions.find((country) => country.name === form.country)?.code ?? '+91'}
                            </span>
                            <input
                              id="mobile-number"
                              type="tel"
                              required
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9 -]/g, '') })}
                              placeholder="98765 43210"
                              className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 focus:outline-none"
                            />
                          </div>
                      </div>

                    <div>
                      <label htmlFor="email" className="mb-2 block text-xs font-medium text-[#8eafd9]">Email address *</label>
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                      />
                    </div>

                    <div>
                      <div>
                          <label htmlFor="country" className="mb-2 block text-xs font-medium text-[#8eafd9]">Country *</label>
                          <select
                            id="country"
                            required
                            value={form.country}
                            onChange={(e) => setForm({ ...form, country: e.target.value })}
                            className="w-full appearance-none rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                          >
                            {countryOptions.map((country) => (
                              <option key={country.name} value={country.name} className="bg-[#0b1a31] text-white">
                                {country.name} ({country.code})
                              </option>
                            ))}
                          </select>
                      </div>

                    </div>

                    <div>
                      <label htmlFor="referral-code" className="mb-2 block text-xs font-medium text-[#8eafd9]">Referral code <span className="font-normal text-[#6f89aa]">(optional)</span></label>
                      <input
                        id="referral-code"
                        type="text"
                        autoComplete="off"
                        value={form.referralCode}
                        onChange={(e) => setForm({ ...form, referralCode: e.target.value.trim().toUpperCase() })}
                        placeholder="Enter referral code if you have one"
                        className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="signup-password" className="mb-2 block text-xs font-medium text-[#8eafd9]">Password *</label>
                        <div className="relative">
                          <input
                            id="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Min. 8 characters"
                            className="w-full rounded-xl border border-[#264467] bg-[#0b1a31]/80 px-4 py-3.5 pr-11 text-sm text-white placeholder-[#7f9abd]/60 transition-colors focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF]/40"
                          />
                          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8eafd9] hover:text-[#00C8FF]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className={`mt-1.5 text-[11px] ${form.password.length >= 8 ? 'text-[#4ade80]' : 'text-[#7894b8]'}`}>
                          {form.password.length >= 8 ? 'Password strength: ready' : 'Use at least 8 characters'}
                        </p>
                      </div>
                      <div>
                        <label htmlFor="confirm-password" className="mb-2 block text-xs font-medium text-[#8eafd9]">Confirm password *</label>
                        <div className="relative">
                          <input
                            id="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            placeholder="Repeat password"
                            className={`w-full rounded-xl bg-white/[0.04] border px-4 py-3.5 pr-11 text-sm text-white placeholder-[#98A2B3]/50 focus:outline-none transition-colors ${
                            form.confirmPassword && form.confirmPassword !== form.password
                              ? 'border-red-500/50 focus:border-red-500/60'
                              : form.confirmPassword && form.confirmPassword === form.password
                              ? 'border-green-500/40 focus:border-green-500/50'
                              : 'border-white/[0.08] focus:border-[#00D4FF]/40'
                          }`}
                          />
                          <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8eafd9] hover:text-[#00C8FF]" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}>
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
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
