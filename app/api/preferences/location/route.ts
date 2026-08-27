import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@/src/auth/session";
import { authorizeSite } from "@/src/auth/access";
import { controlDb } from "@/src/db/control";
import { appUsers, sites } from "@/src/db/control-schema";
import { errorResponse, AppError } from "@/src/lib/errors";
export async function GET(request:Request){try{const user=await currentUser();const siteId=new URL(request.url).searchParams.get("siteId");if(!siteId)throw new AppError("VALIDATION_ERROR","Lokasyon seçimi geçersiz.",400);await authorizeSite(user,siteId);const [site]=await controlDb.select({provinceId:sites.provinceId}).from(sites).where(eq(sites.id,siteId)).limit(1);if(!site)throw new AppError("NOT_FOUND","Lokasyon bulunamadı.",404);await controlDb.update(appUsers).set({lastSiteId:siteId,lastProvinceId:site.provinceId}).where(eq(appUsers.id,user.id));return NextResponse.redirect(new URL("/",request.url))}catch(error){return errorResponse(error)}}
