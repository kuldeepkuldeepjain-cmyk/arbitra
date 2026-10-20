import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL_NON_POOLING

if (!connectionString) {
  throw new Error('A PostgreSQL connection string is required. Configure DATABASE_URL.')
}

export const pool = new Pool({ connectionString })

export const db = drizzle(pool, { schema })
