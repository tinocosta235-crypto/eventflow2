import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createPrisma() {
  const connectionString = (process.env.DATABASE_URL ?? "")
    .replace("?pgbouncer=true", "")
    .replace("&pgbouncer=true", "");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 30000,
  });
  const adapter = new PrismaPg(pool as never);
  return new PrismaClient({ adapter, log: ["error"] });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
