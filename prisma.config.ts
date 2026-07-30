import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma Migrate precisa de conexão direta (session mode) - o pooler em
    // modo transaction (DATABASE_URL, usado em runtime) não suporta DDL.
    url: env("DIRECT_URL"),
  },
});
