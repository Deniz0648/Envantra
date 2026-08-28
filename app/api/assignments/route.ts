import { currentUser } from "@/src/auth/session";
import { authorizeSite, requireWriteRole } from "@/src/auth/access";
import { createAssignmentSchema } from "@/src/validation/assignments";
import { createAssignment } from "@/src/services/assignments";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
import { resolveSiteConnection } from "@/src/db/site-resolver";
import { withSiteDb } from "@/src/db/site-manager";
import { assignments, assets } from "@/src/db/site-schema";
import { adProfiles } from "@/src/db/control-schema";
import { controlDb } from "@/src/db/control";
import { desc, eq, inArray } from "drizzle-orm";
export async function GET(request:Request){try{const user=await currentUser();const urlObject=new URL(request.url);const siteId=urlObject.searchParams.get("siteId");if(!siteId)throw new AppError("VALIDATION_ERROR","siteId zorunludur.",400);await authorizeSite(user,siteId);const connection=await resolveSiteConnection(siteId);const rows=await withSiteDb(siteId,connection,db=>db.select({id:assignments.id,assetId:assignments.assetId,assetName:assets.name,assetCode:assets.assetCode,profileId:assignments.profileId,assignedAt:assignments.assignedAt,returnedAt:assignments.returnedAt,status:assignments.status,notes:assignments.notes}).from(assignments).innerJoin(assets,eq(assets.id,assignments.assetId)).where(eq(assignments.status,"ACTIVE")).orderBy(desc(assignments.assignedAt)));const ids=[...new Set(rows.map(r=>r.profileId))];const people=ids.length?await controlDb.select({id:adProfiles.id,name:adProfiles.displayName,department:adProfiles.department}).from(adProfiles).where(inArray(adProfiles.id,ids)):[];const map=new Map(people.map(p=>[p.id,p]));return ok(rows.map(row=>({...row,profileName:map.get(row.profileId)?.name??"Bilinmeyen personel",department:map.get(row.profileId)?.department??null})))}catch(error){return errorResponse(error)}}
export async function POST(request:Request){try{const user=await currentUser();requireWriteRole(user);const parsed=createAssignmentSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","Zimmet bilgileri geçersiz.",400,parsed.error.flatten());await authorizeSite(user,parsed.data.siteId);return ok(await createAssignment(parsed.data,user.id),{status:201})}catch(error){return errorResponse(error)}}
