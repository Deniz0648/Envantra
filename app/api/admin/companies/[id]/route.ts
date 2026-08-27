import { eq } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { requireAdmin } from "@/src/auth/access";
import { controlDb } from "@/src/db/control";
import { centralAuditLogs, ownerCompanies } from "@/src/db/control-schema";
import { companyUpdateSchema } from "@/src/validation/admin";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await currentUser();requireAdmin(user);const parsed=companyUpdateSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","Şirket bilgileri geçersiz.",400,parsed.error.flatten());const id=(await params).id;const [company]=await controlDb.update(ownerCompanies).set({name:parsed.data.name,code:parsed.data.code?.toUpperCase(),isActive:parsed.data.isActive}).where(eq(ownerCompanies.id,id)).returning();if(!company)throw new AppError("NOT_FOUND","Şirket bulunamadı.",404);await controlDb.insert(centralAuditLogs).values({actorId:user.id,action:"OWNER_COMPANY_UPDATED",entityType:"OWNER_COMPANY",entityId:id,metadata:parsed.data});return ok(company)}catch(error){return errorResponse(error)}}
