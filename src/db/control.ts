import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/src/lib/env";
import * as schema from "./control-schema";

const globalDb = globalThis as unknown as { controlPool?: Pool };
export const controlPool = globalDb.controlPool ?? new Pool({ connectionString: env.CONTROL_DATABASE_URL, max: 10, connectionTimeoutMillis: 3000 });
if (env.NODE_ENV !== "production") globalDb.controlPool = controlPool;
export const controlDb = drizzle(controlPool, { schema });
