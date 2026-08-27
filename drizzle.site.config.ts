import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/site-schema.ts",
  out: "./drizzle/site",
  dbCredentials: { url: process.env.SITE_DATABASE_URL ?? "postgresql://envantra:envantra@localhost:54321/envantra_sites_1" },
});
