'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { activationPaymentMethods, user } from '@/lib/db/schema'
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
  qrImageUrl?: string
  instructions?: string
  isActive?: boolean
}) {
  const adminId = await requireAdmin()
  const values = {
    method: input.method.trim().toLowerCase(),
    label: input.label.trim(),
    upiId: input.upiId?.trim() || null,
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
