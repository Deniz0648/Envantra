import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/control-schema.ts",
  out: "./drizzle/control",
  dbCredentials: { url: process.env.CONTROL_DATABASE_URL ?? "postgresql://envantra:envantra@localhost:54320/envantra_control" },
});
