import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { env } from "@/src/lib/env";
import { AppError } from "@/src/lib/errors";
import type { AuthUser, Role } from "./access";

const key = new TextEncoder().encode(env.AUTH_SECRET);
export async function createSession(user: AuthUser): Promise<void> {
  const token = await new SignJWT({ role: user.role }).setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime("8h").sign(key);
  (await cookies()).set("envantra_session", token, { httpOnly: true, sameSite: "lax", secure: env.NODE_ENV === "production", maxAge: 28_800, path: "/" });
}
export async function currentUser(): Promise<AuthUser> {
  const token = (await cookies()).get("envantra_session")?.value;
  if (!token) throw new AppError("UNAUTHENTICATED", "Oturum açmanız gerekiyor.", 401);
  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload.sub || typeof payload.role !== "string") throw new Error("Eksik oturum");
    return { id: payload.sub, role: payload.role as Role };
  } catch { throw new AppError("UNAUTHENTICATED", "Oturum süreniz doldu.", 401); }
}
