import "server-only";
import { PrismaClient } from "@prisma/client";

function createPrisma() {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL ?? "",
    log: ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || createPrisma();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
