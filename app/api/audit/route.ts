import { desc, eq } from "drizzle-orm";
import { currentUser } from "@/src/auth/session";
import { authorizeSite } from "@/src/auth/access";
import { centralAuditLogs } from "@/src/db/control-schema";
import { controlDb } from "@/src/db/control";
import { siteAuditLogs } from "@/src/db/site-schema";
import { resolveSiteConnection } from "@/src/db/site-resolver";
import { withSiteDb } from "@/src/db/site-manager";
import { AppError, errorResponse, ok } from "@/src/lib/errors";
export async function GET(request:Request){try{const user=await currentUser();const siteId=new URL(request.url).searchParams.get("siteId");if(!siteId)throw new AppError("VALIDATION_ERROR","siteId zorunludur.",400);await authorizeSite(user,siteId);const connection=await resolveSiteConnection(siteId);const [central,local]=await Promise.all([controlDb.select().from(centralAuditLogs).where(eq(centralAuditLogs.siteId,siteId)).orderBy(desc(centralAuditLogs.createdAt)),withSiteDb(siteId,connection,db=>db.select().from(siteAuditLogs).orderBy(desc(siteAuditLogs.createdAt)))]);return ok([...central.map(r=>({...r,source:"CONTROL"})),...local.map(r=>({...r,source:"SITE"}))].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()))}catch(error){return errorResponse(error)}}
