import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { emailOTP } from 'better-auth/plugins'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL
          ? process.env.V0_RUNTIME_URL
          : 'http://localhost:3000'),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 900,
      sendVerificationOnSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        const token = process.env.SENDINBLUE_API_TOKEN
        if (!token) {
          console.error('[v0] OTP delivery is unavailable: SENDINBLUE_API_TOKEN is missing')
          throw new Error('Email delivery is not configured')
        }
        const subject = type === 'sign-in' ? 'Your AlgoBot sign-in code' : type === 'forget-password' ? 'Reset your AlgoBot password' : 'Verify your AlgoBot account'
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { accept: 'application/json', 'api-key': token, 'content-type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'AlgoBot', email: process.env.SENDINBLUE_SENDER_EMAIL ?? 'arbitrageiq5@gmail.com' },
            to: [{ email }],
            subject,
            htmlContent: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1220"><h1 style="color:#087ea4">${type === 'forget-password' ? 'Reset your AlgoBot password' : 'Your AlgoBot verification code'}</h1><p>${type === 'forget-password' ? 'Use this one-time code to securely reset your password:' : 'Use this one-time code to verify your email and continue:'}</p><p style="font-size:32px;font-weight:800;letter-spacing:10px;color:#050816">${otp}</p><p style="color:#64748b;font-size:13px">This code expires in 15 minutes. If you did not request it, you can ignore this email.</p></div>`,
          }),
        })
        if (!response.ok) {
          console.error('[v0] Brevo OTP email failed:', response.status, await response.text())
          throw new Error('Unable to send verification code')
        }
      },
    }),
  ],
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const token = process.env.SENDINBLUE_API_TOKEN
      if (!token) {
        console.error('[v0] Verification email unavailable: SENDINBLUE_API_TOKEN is missing')
        throw new Error('Email delivery is not configured')
      }
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'api-key': token, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'AlgoBot', email: process.env.SENDINBLUE_SENDER_EMAIL ?? 'arbitrageiq5@gmail.com' },
          to: [{ email: user.email }],
          subject: 'Verify your AlgoBot email',
          htmlContent: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1220"><h1 style="color:#087ea4">Verify your AlgoBot email</h1><p>Welcome to AlgoBot. Confirm your email address to activate your account.</p><p><a href="${url}" style="display:inline-block;background:#00d4ff;color:#050816;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify email</a></p><p style="color:#64748b;font-size:13px">This link expires soon. If you did not create an AlgoBot account, you can ignore this email.</p></div>`,
        }),
      })
      if (!response.ok) {
        console.error('[v0] Brevo verification email failed:', response.status, await response.text())
        throw new Error('Unable to send verification email')
      }
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'trader',
        input: true, // allows the client to send role during signUp
      },
    },
  },
  trustedOrigins: [
    // localhost for dev
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    // v0 preview sandbox — vusercontent.net is the v0 preview domain
    'https://vm-crypto-exchange-platform.vusercontent.net',
    // v0 sandbox VM runtime — wildcard covers the per-session subdomain (e.g. sb-<id>.vercel.run)
    'https://*.vercel.run',
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    // Dynamic Vercel deployment URLs (Better Auth does NOT support wildcards — exact only)
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    // Primary origin from env (set per-environment via Vercel CLI)
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    // Known static aliases — all production & preview domains for this project
    'https://arbitrageiq.exchange',
    'https://www.arbitrageiq.exchange',
    'https://arbitra-rho.vercel.app',
    'https://v0-arbitrageiq.vercel.app',
    'https://arbitra-arbitrageiq5-2752s-projects.vercel.app',
    'https://arbitra-arbitrageiq5-2752-arbitrageiq5-2752s-projects.vercel.app',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
            httpOnly: true,
          },
        },
      }
    : {}),
})
