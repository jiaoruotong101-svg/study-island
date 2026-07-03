import { PrismaClient } from '@prisma/client'

/**
 * Prisma 客户端单例。
 *
 * dev 模式下缓存到 globalThis，避免 HMR 时反复创建连接。
 * 注意：当 schema 变更（如新增 model）后，已运行的 dev server 仍持有旧 client 实例；
 * 此时需重启 dev server 才能让新 model（如 Account）生效。
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db