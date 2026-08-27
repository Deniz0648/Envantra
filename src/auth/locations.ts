import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { controlDb } from "@/src/db/control";
import { provinces, sites, userScopes } from "@/src/db/control-schema";
import type { AuthUser } from "./access";

export async function accessibleLocations(user:AuthUser){
  if(user.role==="ADMIN")return controlDb.select({provinceId:provinces.id,provinceName:provinces.name,provinceCode:provinces.code,siteId:sites.id,siteName:sites.name,siteCode:sites.code}).from(sites).innerJoin(provinces,eq(provinces.id,sites.provinceId)).where(and(eq(sites.isActive,true),eq(provinces.isActive,true)));
  const scopes=await controlDb.select().from(userScopes).where(eq(userScopes.userId,user.id));if(scopes.some(s=>s.type==="GLOBAL"))return accessibleLocations({...user,role:"ADMIN"});
  const provinceIds=scopes.flatMap(s=>s.type==="PROVINCE"&&s.provinceId?[s.provinceId]:[]);const siteIds=scopes.flatMap(s=>s.type==="SITE"&&s.siteId?[s.siteId]:[]);
  if(!provinceIds.length&&!siteIds.length)return [];
  const conditions:SQL[]=[];if(provinceIds.length)conditions.push(inArray(sites.provinceId,provinceIds));if(siteIds.length)conditions.push(inArray(sites.id,siteIds));
  return controlDb.select({provinceId:provinces.id,provinceName:provinces.name,provinceCode:provinces.code,siteId:sites.id,siteName:sites.name,siteCode:sites.code}).from(sites).innerJoin(provinces,eq(provinces.id,sites.provinceId)).where(and(eq(sites.isActive,true),eq(provinces.isActive,true),or(...conditions)));
}
