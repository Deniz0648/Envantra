import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./site-schema";
import { env } from "@/src/lib/env";
import { AppError } from "@/src/lib/errors";
import { decryptSiteConnection } from "@/src/lib/secrets";

type SiteDb = NodePgDatabase<typeof schema>;
type Circuit = { failures: number; openedAt?: number; lastSuccessAt?: Date; latencyMs?: number };
type SitePool = { pool: Pool; db: SiteDb; circuit: Circuit; connectionUrl: string };
const pools = new Map<string, SitePool>();

function assertCircuit(siteId: string, circuit: Circuit): void {
  if (!circuit.openedAt) return;
  if (Date.now() - circuit.openedAt >= env.SITE_DB_CIRCUIT_RESET_MS) { circuit.openedAt = undefined; circuit.failures = 0; return; }
  throw new AppError("SITE_DATABASE_UNAVAILABLE", `${siteId} lokasyon veritabanı çevrimdışı.`, 503);
}

export function getSitePool(siteId: string, connectionUrl: string): SitePool {
  const existing = pools.get(siteId);
  if (existing?.connectionUrl === connectionUrl) return existing;
  if (existing) void existing.pool.end();
  const pool = new Pool({ connectionString: connectionUrl, max: 8, connectionTimeoutMillis: env.SITE_DB_CONNECT_TIMEOUT_MS, idleTimeoutMillis: 30_000 });
  pool.on("error", () => undefined);
  const entry = { pool, db: drizzle(pool, { schema }), circuit: { failures: 0 }, connectionUrl };
  pools.set(siteId, entry);
  return entry;
}

export async function withSiteDb<T>(siteId: string, connectionUrl: string, operation: (db: SiteDb) => Promise<T>): Promise<T> {
  const entry = getSitePool(siteId, connectionUrl);
  assertCircuit(siteId, entry.circuit);
  const started = performance.now();
  try {
    const result = await operation(entry.db);
    entry.circuit.failures = 0; entry.circuit.lastSuccessAt = new Date(); entry.circuit.latencyMs = Math.round(performance.now() - started);
    return result;
  } catch (cause) {
    const code = typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : "";
    const connectionFailure = code.startsWith("08") || ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "57P01", "57P02", "57P03"].includes(code);
    if (!connectionFailure) throw cause;
    entry.circuit.failures += 1;
    if (entry.circuit.failures >= env.SITE_DB_CIRCUIT_FAILURE_THRESHOLD) entry.circuit.openedAt = Date.now();
    console.error("Lokasyon veritabanı hatası", { siteId, message: cause instanceof Error ? cause.message : "Bilinmeyen hata" });
    throw new AppError("SITE_DATABASE_UNAVAILABLE", "Lokasyon veritabanına erişilemiyor.", 503);
  }
}

export async function allSitesSettled<T>(sites: ReadonlyArray<{ id: string; connectionUrl: string }>, operation: (db: SiteDb, siteId: string) => Promise<T>) {
  return Promise.allSettled(sites.map((site) => {const url=site.connectionUrl.startsWith("plain:")||site.connectionUrl.startsWith("enc:")?decryptSiteConnection(site.connectionUrl):site.connectionUrl;return withSiteDb(site.id,url,(db) => operation(db, site.id))}));
}

export function getCircuitSnapshot(siteId: string): Readonly<Circuit> | undefined { return pools.get(siteId)?.circuit; }
export async function closeAllSitePools():Promise<void>{const active=[...pools.values()];pools.clear();await Promise.allSettled(active.map(entry=>entry.pool.end()))}
