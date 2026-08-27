import { and, eq, or } from "drizzle-orm";
import { controlDb } from "@/src/db/control";
import { sites, userScopes } from "@/src/db/control-schema";
import { AppError } from "@/src/lib/errors";

export type Role = "ADMIN" | "IT_OPERATOR" | "VIEWER" | "AUDITOR";
export type AuthUser = { id: string; role: Role };

const writes: Role[] = ["ADMIN", "IT_OPERATOR"];
export function requireWriteRole(user: AuthUser): void {
  if (!writes.includes(user.role)) throw new AppError("FORBIDDEN", "Bu işlem için yetkiniz yok.", 403);
}
export function requireAdmin(user:AuthUser):void{if(user.role!=="ADMIN")throw new AppError("FORBIDDEN","Bu işlem yalnızca yöneticiler tarafından yapılabilir.",403)}

export async function authorizeSite(user: AuthUser, requestedSiteId: string): Promise<void> {
  if (user.role === "ADMIN") return;
  const [globalScope] = await controlDb.select({ id: userScopes.id }).from(userScopes).where(and(eq(userScopes.userId, user.id), eq(userScopes.type, "GLOBAL"))).limit(1);
  if (globalScope) return;
  const allowed = await controlDb.select({ id: sites.id }).from(userScopes).innerJoin(sites,
    or(eq(userScopes.siteId, sites.id), and(eq(userScopes.provinceId, sites.provinceId), eq(userScopes.type, "PROVINCE")))
  ).where(and(eq(userScopes.userId, user.id), eq(sites.id, requestedSiteId))).limit(1);
  if (allowed.length === 0) throw new AppError("FORBIDDEN", "Bu lokasyona erişim yetkiniz yok.", 403);
}
