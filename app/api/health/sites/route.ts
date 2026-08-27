import { eq } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { controlDb } from "@/src/db/control";
import { siteConnections, sites } from "@/src/db/control-schema";
import { allSitesSettled } from "@/src/db/site-manager";
import { errorResponse, ok } from "@/src/lib/errors";
import { sql } from "drizzle-orm";

export async function GET(){try{await currentUser();const records=await controlDb.select({id:sites.id,name:sites.name,connectionUrl:siteConnections.encryptedUrl,lastSuccessAt:siteConnections.lastSuccessAt,lastFailureAt:siteConnections.lastFailureAt}).from(sites).innerJoin(siteConnections,eq(sites.id,siteConnections.siteId)).where(eq(sites.isActive,true));const results=await allSitesSettled(records,async db=>{const start=performance.now();await db.execute(sql`select 1`);return Math.round(performance.now()-start)});const now=new Date();await Promise.allSettled(records.map((site,index)=>{const result=results[index];return controlDb.update(siteConnections).set(result?.status==="fulfilled"?{lastSuccessAt:now,latencyMs:result.value,lastErrorCode:null}:{lastFailureAt:now,latencyMs:null,lastErrorCode:"SITE_DATABASE_UNAVAILABLE"}).where(eq(siteConnections.siteId,site.id))}));return ok(records.map((site,index)=>{const result=results[index];return {id:site.id,name:site.name,status:result?.status==="fulfilled"?"ONLINE":"OFFLINE",latencyMs:result?.status==="fulfilled"?result.value:null,errorCode:result?.status==="rejected"?"SITE_DATABASE_UNAVAILABLE":null,lastSuccessAt:result?.status==="fulfilled"?now:site.lastSuccessAt,lastFailureAt:result?.status==="rejected"?now:site.lastFailureAt}}))}catch(error){return errorResponse(error)}}
