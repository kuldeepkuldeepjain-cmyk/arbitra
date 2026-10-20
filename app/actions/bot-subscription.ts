'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { BOT_SUBSCRIPTION } from '@/lib/products'

export async function createBotSubscriptionCheckout() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const origin = process.env.BETTER_AUTH_URL ?? process.env.VERCEL_URL
  const baseUrl = origin?.startsWith('http') ? origin : `https://${origin ?? 'localhost:3000'}`

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: BOT_SUBSCRIPTION.currency,
        unit_amount: BOT_SUBSCRIPTION.amountInPaise,
        recurring: { interval: 'month' },
        product_data: { name: BOT_SUBSCRIPTION.name, description: BOT_SUBSCRIPTION.description },
      },
      quantity: 1,
    }],
    success_url: `${baseUrl}/trader?payment=success`,
    cancel_url: `${baseUrl}/trader?payment=cancelled`,
    customer_email: session.user.email,
    metadata: { userId: session.user.id, productId: BOT_SUBSCRIPTION.id },
    subscription_data: { metadata: { userId: session.user.id, productId: BOT_SUBSCRIPTION.id } },
    integration_identifier: `arbitra-bot-${Math.random().toString(36).slice(2, 10)}`,
  })

  if (!checkout.url) throw new Error('Unable to start checkout')
  return checkout.url
}
