import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --project tsconfig.json -e \"require('./prisma/seed.ts')\"",
  },
  datasource: {
    // DIRECT_URL for migrations (bypasses PgBouncer), DATABASE_URL for runtime
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
