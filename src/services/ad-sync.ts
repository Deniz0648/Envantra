import { Client, type Entry } from "ldapts";
import { eq } from "drizzle-orm";
import { controlDb } from "@/src/db/control";
import { adOuMappings, adProfiles, adSyncRuns, assetCategories, ownerCompanies, siteConnections, sites, unmatchedAdRecords } from "@/src/db/control-schema";
import { assets, computerDetails } from "@/src/db/site-schema";
import { withSiteDb } from "@/src/db/site-manager";
import { env } from "@/src/lib/env";
import { decryptSiteConnection } from "@/src/lib/secrets";

export type SyncCounters={added:number;updated:number;unchanged:number;unmatched:number;failed:number};
const value=(entry:Entry,key:string):string=>{const raw=entry[key];if(Buffer.isBuffer(raw))return raw.toString("hex");if(Array.isArray(raw))return String(raw[0]??"");return String(raw??"")};
const disabled=(entry:Entry)=>Boolean(Number(value(entry,"userAccountControl"))&2);

export async function synchronizeAd():Promise<SyncCounters>{
  const [run]=await controlDb.insert(adSyncRuns).values({status:"RUNNING"}).returning();
  if(!run)throw new Error("Senkronizasyon kaydı oluşturulamadı.");
  const counters:SyncCounters={added:0,updated:0,unchanged:0,unmatched:0,failed:0};
  const client=new Client({url:env.LDAP_URL,timeout:10_000,connectTimeout:5_000});
  try{
    await client.bind(env.LDAP_BIND_DN,env.LDAP_BIND_PASSWORD);
    const [usersResult,computersResult]=await Promise.all([
      client.search(env.LDAP_BASE_DN,{scope:"sub",filter:"(&(objectClass=user)(!(objectClass=computer)))",attributes:["objectGUID","sAMAccountName","displayName","mail","department","title","company","distinguishedName","userAccountControl"]}),
      client.search(env.LDAP_BASE_DN,{scope:"sub",filter:"(objectClass=computer)",attributes:["objectGUID","name","sAMAccountName","dNSHostName","operatingSystem","operatingSystemVersion","distinguishedName","lastLogonTimestamp","userAccountControl"]}),
    ]);
    for(const entry of usersResult.searchEntries){try{const guid=value(entry,"objectGUID");const existing=await controlDb.select({id:adProfiles.id}).from(adProfiles).where(eq(adProfiles.objectGuid,guid)).limit(1);await controlDb.insert(adProfiles).values({objectGuid:guid,username:value(entry,"sAMAccountName"),displayName:value(entry,"displayName")||value(entry,"sAMAccountName"),email:value(entry,"mail")||null,department:value(entry,"department")||null,title:value(entry,"title")||null,company:value(entry,"company")||null,distinguishedName:value(entry,"distinguishedName"),isActive:!disabled(entry),lastSyncedAt:new Date()}).onConflictDoUpdate({target:adProfiles.objectGuid,set:{username:value(entry,"sAMAccountName"),displayName:value(entry,"displayName")||value(entry,"sAMAccountName"),email:value(entry,"mail")||null,department:value(entry,"department")||null,title:value(entry,"title")||null,company:value(entry,"company")||null,distinguishedName:value(entry,"distinguishedName"),isActive:!disabled(entry),lastSyncedAt:new Date()}});if(existing.length)counters.updated++;else counters.added++}catch{counters.failed++}}
    const rawMappings=await controlDb.select({ouDn:adOuMappings.ouDn,siteId:sites.id,provinceId:sites.provinceId,url:siteConnections.encryptedUrl}).from(adOuMappings).innerJoin(sites,eq(sites.id,adOuMappings.siteId)).innerJoin(siteConnections,eq(siteConnections.siteId,sites.id)).where(eq(adOuMappings.isActive,true));
    const mappings=rawMappings.map(mapping=>({...mapping,url:decryptSiteConnection(mapping.url)}));
    const [category]=await controlDb.select({id:assetCategories.id}).from(assetCategories).where(eq(assetCategories.slug,"desktop")).limit(1);const [owner]=await controlDb.select({id:ownerCompanies.id}).from(ownerCompanies).where(eq(ownerCompanies.isActive,true)).limit(1);
    for(const entry of computersResult.searchEntries){try{const dn=value(entry,"distinguishedName");const guid=value(entry,"objectGUID");const mapping=mappings.find(m=>dn.toLocaleLowerCase("tr").includes(m.ouDn.toLocaleLowerCase("tr")));if(!mapping||!category||!owner){await controlDb.insert(unmatchedAdRecords).values({objectGuid:guid,objectType:"COMPUTER",name:value(entry,"name"),distinguishedName:dn,reason:!mapping?"OU_MAPPING_NOT_FOUND":"DEFAULT_CATEGORY_OR_OWNER_NOT_FOUND",lastSeenAt:new Date()}).onConflictDoUpdate({target:unmatchedAdRecords.objectGuid,set:{name:value(entry,"name"),distinguishedName:dn,reason:!mapping?"OU_MAPPING_NOT_FOUND":"DEFAULT_CATEGORY_OR_OWNER_NOT_FOUND",isResolved:false,resolvedSiteId:null,lastSeenAt:new Date()}});counters.unmatched++;continue}await controlDb.update(unmatchedAdRecords).set({isResolved:true,resolvedSiteId:mapping.siteId,lastSeenAt:new Date()}).where(eq(unmatchedAdRecords.objectGuid,guid));const changed=await withSiteDb(mapping.siteId,mapping.url,async db=>db.transaction(async tx=>{const [known]=await tx.select({assetId:computerDetails.assetId}).from(computerDetails).where(eq(computerDetails.adObjectGuid,guid)).limit(1);if(known){await tx.update(computerDetails).set({operatingSystem:value(entry,"operatingSystem")||null,adDistinguishedName:dn,lastAdSyncAt:new Date()}).where(eq(computerDetails.assetId,known.assetId));return false}const [asset]=await tx.insert(assets).values({assetCode:`AD-${guid.replace(/[^a-zA-Z0-9]/g,"").slice(0,16).toUpperCase()}`,categoryId:category.id,ownerCompanyId:owner.id,provinceId:mapping.provinceId,siteId:mapping.siteId,name:value(entry,"name"),status:"DRAFT",fromAd:true}).returning({id:assets.id});if(!asset)throw new Error("AD varlığı oluşturulamadı");await tx.insert(computerDetails).values({assetId:asset.id,hostname:value(entry,"dNSHostName")||value(entry,"name"),operatingSystem:value(entry,"operatingSystem")||null,adObjectGuid:guid,adDistinguishedName:dn,lastAdSyncAt:new Date()});return true}));if(changed)counters.added++;else counters.updated++}catch{counters.failed++}}
    await controlDb.update(adSyncRuns).set({...counters,status:counters.failed?"PARTIAL":"COMPLETED",finishedAt:new Date()}).where(eq(adSyncRuns.id,run.id));return counters;
  }catch(error){await controlDb.update(adSyncRuns).set({...counters,status:"FAILED",finishedAt:new Date(),details:{message:error instanceof Error?error.message:"Bilinmeyen hata"}}).where(eq(adSyncRuns.id,run.id));throw error}finally{await client.unbind().catch(()=>undefined)}
}
