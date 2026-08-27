import { sql } from "drizzle-orm";
import { controlDb } from "@/src/db/control";
export async function GET(){try{await controlDb.execute(sql`select 1`);return Response.json({ok:true,status:"healthy"})}catch{return Response.json({ok:false,status:"unhealthy"},{status:503})}}
