import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const signature = (await headers()).get('stripe-signature')
  const body = await request.text()
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const checkout = event.data.object
    if (checkout.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded') {
      const userId = checkout.metadata?.userId
      if (userId) {
        await db.update(user).set({ isActivated: true, activationPaidAt: new Date() }).where(eq(user.id, userId))
      }
    }
  }

  return NextResponse.json({ received: true })
}
