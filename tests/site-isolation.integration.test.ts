import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { allSitesSettled, closeAllSitePools } from "../src/db/site-manager";

const validUrl=process.env.TEST_SITE_DATABASE_URL;const suite=validUrl?describe:describe.skip;
suite("lokasyon veritabanı hata izolasyonu",()=>{
  it("çevrimdışı lokasyon diğer lokasyonun sorgusunu düşürmez",async()=>{const sites=[{id:randomUUID(),connectionUrl:validUrl!},{id:randomUUID(),connectionUrl:"postgresql://invalid:invalid@127.0.0.1:1/unavailable"}];const results=await allSitesSettled(sites,async db=>{await db.execute(sql`select 1`);return "ok"});expect(results[0]).toMatchObject({status:"fulfilled",value:"ok"});expect(results[1]?.status).toBe("rejected");await closeAllSitePools()});
});
