import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { controlDb } from "@/src/db/control";
import { appUsers } from "@/src/db/control-schema";
import { createSession } from "@/src/auth/session";
import { errorResponse, AppError, ok } from "@/src/lib/errors";
import { assertLoginAllowed, clearLoginFailures, loginAttemptKey, recordLoginFailure } from "@/src/auth/login-rate-limit";

const input = z.object({ username: z.string().trim().min(2).max(100), password: z.string().min(8).max(200) });
export async function POST(request: Request) { try {
  const parsed=input.safeParse(await request.json()); if(!parsed.success) throw new AppError("VALIDATION_ERROR","Giriş bilgileri geçersiz.",400,parsed.error.flatten());
  const attemptKey=loginAttemptKey(request,parsed.data.username);assertLoginAllowed(attemptKey);
  const [user]=await controlDb.select().from(appUsers).where(eq(appUsers.username,parsed.data.username)).limit(1);
  if(!user?.isActive || !(await compare(parsed.data.password,user.passwordHash))){recordLoginFailure(attemptKey);throw new AppError("UNAUTHENTICATED","Kullanıcı adı veya parola hatalı.",401)}
  clearLoginFailures(attemptKey);
  await createSession({id:user.id,role:user.role}); return ok({displayName:user.displayName,next:user.lastSiteId?"/":"/select"});
} catch(error){return errorResponse(error)} }
