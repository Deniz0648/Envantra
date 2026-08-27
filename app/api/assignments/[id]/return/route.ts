import { currentUser } from "@/src/auth/session";
import { authorizeSite, requireWriteRole } from "@/src/auth/access";
import { returnAssignmentSchema } from "@/src/validation/assignments";
import { returnAssignment } from "@/src/services/assignments";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const user=await currentUser();requireWriteRole(user);const parsed=returnAssignmentSchema.safeParse(await request.json());if(!parsed.success)throw new AppError("VALIDATION_ERROR","İade bilgileri geçersiz.",400,parsed.error.flatten());await authorizeSite(user,parsed.data.siteId);return ok(await returnAssignment((await params).id,parsed.data,user.id))}catch(error){return errorResponse(error)}}
