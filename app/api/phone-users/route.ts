import { currentUser } from "@/src/auth/session";
import { authorizeSite, requireWriteRole } from "@/src/auth/access";
import { createPhoneUserSchema } from "@/src/validation/assignments";
import { assignPhoneUser } from "@/src/services/phone-users";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
import { resolveSiteConnection } from "@/src/db/site-resolver";
import { withSiteDb } from "@/src/db/site-manager";
import { assets, phoneUsers } from "@/src/db/site-schema";
import { adProfiles } from "@/src/db/control-schema";
import { controlDb } from "@/src/db/control";
import { desc, eq, inArray } from "drizzle-orm";
export async function GET(request:Request){try{const user=await currentUser();const siteId=new URL(request.url).searchParams.get("siteId");if(!siteId)throw new AppError("VALIDATION_ERROR","siteId zorunludur.",400);await authorizeSite(user,siteId);const connection=await resolveSiteConnection(siteId);const rows=await withSiteDb(siteId,connection,db=>db.select({id:phoneUsers.id,assetId:phoneUsers.assetId,assetName:assets.name,assetCode:assets.assetCode,profileId:phoneUsers.profileId,sharedRoomId:phoneUsers.sharedRoomId,extension:phoneUsers.extension,phoneNumber:phoneUsers.phoneNumber,startDate:phoneUsers.startDate,endDate:phoneUsers.endDate,isActive:phoneUsers.isActive}).from(phoneUsers).innerJoin(assets,eq(assets.id,phoneUsers.assetId)).orderBy(desc(phoneUsers.startDate)));const ids=[...new Set(rows.flatMap(r=>r.profileId?[r.profileId]:[]))];const people=ids.length?await controlDb.select({id:adProfiles.id,name:adProfiles.displayName,department:adProfiles.department}).from(adProfiles).where(inArray(adProfiles.id,ids)):[];const map=new Map(people.map(p=>[p.id,p]));return ok(rows.map(row=>({...row,profileName:row.profileId?map.get(row.profileId)?.name??"Bilinmeyen personel":"Ortak kullanım"})))}catch(error){return errorResponse(error)}}
export async function POST(request:Request){try{const user=await currentUser();requireWriteRole(user);const parsed=createPhoneUserSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","Telefon kullanıcı bilgileri geçersiz.",400,parsed.error.flatten());await authorizeSite(user,parsed.data.siteId);return ok(await assignPhoneUser(parsed.data,user.id),{status:201})}catch(error){return errorResponse(error)}}
