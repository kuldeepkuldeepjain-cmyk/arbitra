import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Registration } from '@/components/landing/registration'
import AuthForm from '@/components/auth-form'

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const emailVerified = Boolean((session?.user as unknown as { emailVerified?: boolean })?.emailVerified)
  const role = (session?.user as unknown as { role?: string })?.role
  if (session?.user && !emailVerified) return <AuthForm mode="sign-up" />
  if (role === 'admin') redirect('/admin')
  if (role === 'protrader') redirect('/protrader')
  if (role === 'trader') redirect('/trader')
  if (session?.user) redirect('/viewer')
  return <Registration />
}
