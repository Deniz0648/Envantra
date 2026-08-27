import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CONTROL_DATABASE_URL: z.string().url().default("postgresql://envantra:envantra@localhost:54320/envantra_control"),
  AUTH_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  SITE_DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  SITE_DB_CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(3),
  SITE_DB_CIRCUIT_RESET_MS: z.coerce.number().int().positive().default(30000),
  SITE_DB_ENCRYPTION_KEY: z.string().optional(),
  LDAP_URL: z.string().url().default("ldap://127.0.0.1:1389"),
  LDAP_BASE_DN: z.string().default("DC=devad,DC=test"),
  LDAP_BIND_DN: z.string().default("CN=Administrator,CN=Users,DC=devad,DC=test"),
  LDAP_BIND_PASSWORD: z.string().default("DevOnly!12345"),
});

export const env = schema.parse(process.env);
