import { and, eq } from "drizzle-orm";
import { controlDb } from "./control";
import { siteConnections, sites } from "./control-schema";
import { AppError } from "@/src/lib/errors";
import { decryptSiteConnection } from "@/src/lib/secrets";

export async function resolveSiteConnection(siteId:string):Promise<string>{
  const [record]=await controlDb.select({url:siteConnections.encryptedUrl}).from(siteConnections).innerJoin(sites,eq(sites.id,siteConnections.siteId)).where(and(eq(sites.id,siteId),eq(sites.isActive,true))).limit(1);
  if(!record)throw new AppError("NOT_FOUND","Lokasyon bulunamadı.",404);
  return decryptSiteConnection(record.url);
}
