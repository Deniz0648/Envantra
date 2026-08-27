import { asc } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { requireAdmin } from "@/src/auth/access";
import { controlDb } from "@/src/db/control";
import { centralAuditLogs, ownerCompanies } from "@/src/db/control-schema";
import { companyCreateSchema } from "@/src/validation/admin";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
export async function GET(){try{await currentUser();return ok(await controlDb.select().from(ownerCompanies).orderBy(asc(ownerCompanies.name)))}catch(error){return errorResponse(error)}}
export async function POST(request:Request){try{const user=await currentUser();requireAdmin(user);const parsed=companyCreateSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","Şirket bilgileri geçersiz.",400,parsed.error.flatten());const [company]=await controlDb.insert(ownerCompanies).values({name:parsed.data.name,code:parsed.data.code.toUpperCase()}).returning();if(!company)throw new Error("Şirket oluşturulamadı");await controlDb.insert(centralAuditLogs).values({actorId:user.id,action:"OWNER_COMPANY_CREATED",entityType:"OWNER_COMPANY",entityId:company.id,metadata:{code:company.code}});return ok(company,{status:201})}catch(error){return errorResponse(error)}}
