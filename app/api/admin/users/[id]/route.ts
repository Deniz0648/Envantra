import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { requireAdmin } from "@/src/auth/access";
import { controlDb } from "@/src/db/control";
import { appUsers, centralAuditLogs, userScopes } from "@/src/db/control-schema";
import { updateAppUserSchema } from "@/src/validation/users";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await currentUser();requireAdmin(actor);const id=(await params).id;const parsed=updateAppUserSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","Kullanıcı bilgileri geçersiz.",400,parsed.error.flatten());const input=parsed.data;if(id===actor.id&&(input.isActive===false||(input.role&&input.role!=="ADMIN")))throw new AppError("CONFLICT","Kendi yönetici hesabınızı pasife alamaz veya rolünü düşüremezsiniz.",409);const updated=await controlDb.transaction(async tx=>{const [user]=await tx.update(appUsers).set({role:input.role,isActive:input.isActive,passwordHash:input.password?await hash(input.password,12):undefined}).where(eq(appUsers.id,id)).returning();if(!user)throw new AppError("NOT_FOUND","Kullanıcı bulunamadı.",404);if(input.scopes){await tx.delete(userScopes).where(eq(userScopes.userId,id));await tx.insert(userScopes).values(input.scopes.map(scope=>({userId:id,type:scope.type,provinceId:scope.provinceId,siteId:scope.siteId})))}await tx.insert(centralAuditLogs).values({actorId:actor.id,action:"APP_USER_UPDATED",entityType:"APP_USER",entityId:id,metadata:{role:input.role,isActive:input.isActive,scopesChanged:Boolean(input.scopes)}});return user});return ok(updated)}catch(error){return errorResponse(error)}}
