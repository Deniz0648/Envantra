import { asc, ilike, or } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { controlDb } from "@/src/db/control";
import { adProfiles } from "@/src/db/control-schema";
import { errorResponse, ok } from "@/src/lib/errors";
export async function GET(request:Request){try{await currentUser();const query=new URL(request.url).searchParams.get("q")?.trim();const base=controlDb.select({id:adProfiles.id,username:adProfiles.username,displayName:adProfiles.displayName,email:adProfiles.email,department:adProfiles.department,title:adProfiles.title,company:adProfiles.company,isActive:adProfiles.isActive,lastSyncedAt:adProfiles.lastSyncedAt}).from(adProfiles);const rows=query?await base.where(or(ilike(adProfiles.displayName,`%${query}%`),ilike(adProfiles.username,`%${query}%`),ilike(adProfiles.email,`%${query}%`))).orderBy(asc(adProfiles.displayName)):await base.orderBy(asc(adProfiles.displayName));return ok(rows)}catch(error){return errorResponse(error)}}
