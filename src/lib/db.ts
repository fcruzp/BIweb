import { PrismaClient } from '@prisma/client'

// Fix: Ensure DATABASE_URL points to PostgreSQL (system env may override .env files)
// This is needed because the sandbox environment has a persistent SQLite DATABASE_URL
const POSTGRES_URL = 'postgresql://postgres.rsrcdaepiwjqfynwwzcn:GGu12qk8uCNsMSbW@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connect_timeout=15'
const POSTGRES_DIRECT_URL = 'postgresql://postgres.rsrcdaepiwjqfynwwzcn:GGu12qk8uCNsMSbW@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=15'

if (!process.env.DATABASE_URL?.startsWith('postgresql://')) {
  process.env.DATABASE_URL = POSTGRES_URL
}
if (!process.env.DIRECT_URL?.startsWith('postgresql://')) {
  process.env.DIRECT_URL = POSTGRES_DIRECT_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
