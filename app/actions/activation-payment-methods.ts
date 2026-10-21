'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { activationPaymentMethods, botActivationPlans, user } from '@/lib/db/schema'
import { asc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const [admin] = await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id)).limit(1)
  if (admin?.role !== 'admin') throw new Error('Forbidden')
  return session.user.id
}

export async function getActivationPaymentMethods() {
  const methods = await db.select().from(activationPaymentMethods)
    .where(eq(activationPaymentMethods.isActive, true))
    .orderBy(asc(activationPaymentMethods.id))
  return methods
}

export async function getAllActivationPaymentMethods() {
  await requireAdmin()
  return db.select().from(activationPaymentMethods).orderBy(asc(activationPaymentMethods.id))
}

export async function upsertActivationPaymentMethod(input: {
  id?: number
  method: string
  label: string
  upiId?: string
  walletAddress?: string
  currency?: string
  qrImageUrl?: string
  instructions?: string
  isActive?: boolean
}) {
  const adminId = await requireAdmin()
  const values = {
    method: input.method.trim().toLowerCase(),
    label: input.label.trim(),
    upiId: input.upiId?.trim() || null,
    walletAddress: input.walletAddress?.trim() || null,
    currency: input.currency?.trim().toUpperCase() || 'INR',
    qrImageUrl: input.qrImageUrl?.trim() || null,
    instructions: input.instructions?.trim() || null,
    isActive: input.isActive ?? true,
    createdBy: adminId,
    updatedAt: new Date(),
  }
  if (!values.method || !values.label) throw new Error('Method and label are required')
  if (input.id) {
    await db.update(activationPaymentMethods).set(values).where(eq(activationPaymentMethods.id, input.id))
  } else {
    await db.insert(activationPaymentMethods).values(values)
  }
  return { success: true }
}

export async function toggleActivationPaymentMethod(id: number, isActive: boolean) {
  await requireAdmin()
  await db.update(activationPaymentMethods).set({ isActive, updatedAt: new Date() }).where(eq(activationPaymentMethods.id, id))
  return { success: true }
}

export async function getActiveBotActivationPlans() {
  return db.select().from(botActivationPlans)
    .where(eq(botActivationPlans.isActive, true))
    .orderBy(asc(botActivationPlans.durationMonths))
}

export async function getAllBotActivationPlans() {
  await requireAdmin()
  return db.select().from(botActivationPlans).orderBy(asc(botActivationPlans.durationMonths))
}

export async function upsertBotActivationPlan(input: { id?: number; name: string; durationMonths: number; priceInr: string; description?: string; isActive?: boolean }) {
  const adminId = await requireAdmin()
  if (!input.name.trim() || input.durationMonths < 1 || Number(input.priceInr) <= 0) throw new Error('Valid plan name, duration, and price are required')
  const values = { name: input.name.trim(), durationMonths: input.durationMonths, priceInr: input.priceInr, description: input.description?.trim() || null, isActive: input.isActive ?? true, createdBy: adminId, updatedAt: new Date() }
  if (input.id) await db.update(botActivationPlans).set(values).where(eq(botActivationPlans.id, input.id))
  else await db.insert(botActivationPlans).values(values)
  return { success: true }
}

export async function toggleBotActivationPlan(id: number, isActive: boolean) {
  await requireAdmin()
  await db.update(botActivationPlans).set({ isActive, updatedAt: new Date() }).where(eq(botActivationPlans.id, id))
  return { success: true }
}
