import { asc } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { requireAdmin } from "@/src/auth/access";
import { controlDb } from "@/src/db/control";
import { assetCategories, centralAuditLogs } from "@/src/db/control-schema";
import { categoryCreateSchema } from "@/src/validation/admin";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
export async function GET(){try{await currentUser();return ok(await controlDb.select().from(assetCategories).orderBy(asc(assetCategories.group),asc(assetCategories.name)))}catch(error){return errorResponse(error)}}
export async function POST(request:Request){try{const user=await currentUser();requireAdmin(user);const parsed=categoryCreateSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","Kategori bilgileri geçersiz.",400,parsed.error.flatten());const [category]=await controlDb.insert(assetCategories).values(parsed.data).returning();if(!category)throw new Error("Kategori oluşturulamadı");await controlDb.insert(centralAuditLogs).values({actorId:user.id,action:"CATEGORY_CREATED",entityType:"CATEGORY",entityId:category.id,metadata:{name:category.name,code:category.code}});return ok(category,{status:201})}catch(error){return errorResponse(error)}}
