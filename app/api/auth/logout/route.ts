import { cookies } from "next/headers";
import { ok } from "@/src/lib/errors";
export async function POST(){(await cookies()).set("envantra_session","",{httpOnly:true,sameSite:"lax",expires:new Date(0),path:"/"});return ok({signedOut:true})}
