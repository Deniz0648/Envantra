import { eq } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { requireAdmin } from "@/src/auth/access";
import { controlDb } from "@/src/db/control";
import { assetCategories, centralAuditLogs } from "@/src/db/control-schema";
import { categoryUpdateSchema } from "@/src/validation/admin";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await currentUser();requireAdmin(user);const parsed=categoryUpdateSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","Kategori bilgileri geçersiz.",400,parsed.error.flatten());const id=(await params).id;const [category]=await controlDb.update(assetCategories).set(parsed.data).where(eq(assetCategories.id,id)).returning();if(!category)throw new AppError("NOT_FOUND","Kategori bulunamadı.",404);await controlDb.insert(centralAuditLogs).values({actorId:user.id,action:"CATEGORY_UPDATED",entityType:"CATEGORY",entityId:id,metadata:parsed.data});return ok(category)}catch(error){return errorResponse(error)}}
