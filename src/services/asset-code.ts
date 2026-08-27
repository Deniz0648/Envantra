import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as siteSchema from "@/src/db/site-schema";

type SiteDb = NodePgDatabase<typeof siteSchema>;
export type CodeParts = { provinceCode: string; siteCode: string; rackCode: string; categoryCode: string };

export function formatAssetCode(parts: CodeParts, sequence: number): string {
  const clean = (value: string) => value.toLocaleUpperCase("tr-TR").replace(/İ/g, "I").replace(/[^A-Z0-9]/g, "");
  return [parts.provinceCode, parts.siteCode, parts.rackCode, parts.categoryCode, String(sequence).padStart(3, "0")].map(clean).join("-");
}

export async function reserveAssetCode(db: SiteDb, ids: { siteId: string; rackId: string; categoryId: string }, parts: CodeParts): Promise<string> {
  const result = await db.execute<{ sequence: number }>(sql`
    INSERT INTO asset_code_sequences (site_id, rack_id, category_id, next_value)
    VALUES (${ids.siteId}::uuid, ${ids.rackId}::uuid, ${ids.categoryId}::uuid, 2)
    ON CONFLICT (site_id, rack_id, category_id)
    DO UPDATE SET next_value = asset_code_sequences.next_value + 1
    RETURNING next_value - 1 AS sequence`);
  const sequence = Number(result.rows[0]?.sequence);
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Varlık sıra numarası üretilemedi.");
  return formatAssetCode(parts, sequence);
}
