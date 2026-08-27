import { count, desc, eq, inArray, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Dashboard, type DashboardSummary } from "@/components/dashboard";
import { currentUser } from "@/src/auth/session";
import { controlDb } from "@/src/db/control";
import { adSyncRuns, appUsers, assetCategories, provinces, rooms, siteConnections, sites, unmatchedAdRecords } from "@/src/db/control-schema";
import { assignments, assets } from "@/src/db/site-schema";
import { getCircuitSnapshot, withSiteDb } from "@/src/db/site-manager";
import { decryptSiteConnection } from "@/src/lib/secrets";

export default async function HomePage(){
  let user:Awaited<ReturnType<typeof currentUser>>;
  try{user=await currentUser()}catch{redirect("/login")}

  const [location]=await controlDb.select({
    siteId:sites.id,siteName:sites.name,provinceName:provinces.name,url:siteConnections.encryptedUrl,latencyMs:siteConnections.latencyMs,
    displayName:appUsers.displayName,role:appUsers.role,
  }).from(appUsers)
    .leftJoin(sites,eq(sites.id,appUsers.lastSiteId))
    .leftJoin(provinces,eq(provinces.id,appUsers.lastProvinceId))
    .leftJoin(siteConnections,eq(siteConnections.siteId,sites.id))
    .where(eq(appUsers.id,user.id)).limit(1);

  if(!location?.siteId)redirect("/select");

  const [controlSummary,lastSync,categories]=await Promise.all([
    controlDb.select({unmatchedAd:count()}).from(unmatchedAdRecords).where(eq(unmatchedAdRecords.isResolved,false)),
    controlDb.select({status:adSyncRuns.status,startedAt:adSyncRuns.startedAt,finishedAt:adSyncRuns.finishedAt,failed:adSyncRuns.failed})
      .from(adSyncRuns).orderBy(desc(adSyncRuns.startedAt)).limit(1),
    controlDb.select({id:assetCategories.id,name:assetCategories.name,group:assetCategories.group}).from(assetCategories),
  ]);

  let liveAssets:Awaited<ReturnType<typeof enrichAssets>>=[];
  let online=false;
  let activeAssignments:number|null=null;
  let totalAssets:number|null=null;
  let networkAssets:number|null=null;
  let attentionAssets:number|null=null;
  let siteLatencyMs:number|null=null;
  if(location.url){
    try{
      const snapshot=await loadSiteSnapshot(location.siteId,decryptSiteConnection(location.url),categories.filter(category=>category.group==="NETWORK").map(category=>category.id));
      siteLatencyMs=getCircuitSnapshot(location.siteId)?.latencyMs??location.latencyMs;
      activeAssignments=snapshot.activeAssignments;
      totalAssets=snapshot.totalAssets;
      networkAssets=snapshot.networkAssets;
      attentionAssets=snapshot.attentionAssets;
      liveAssets=await enrichAssets(snapshot.assets,categories);
      online=true;
    }catch{online=false}
  }

  const summary:DashboardSummary={
    activeAssignments,
    totalAssets,
    networkAssets,
    attentionAssets,
    unmatchedAd:Number(controlSummary[0]?.unmatchedAd??0),
    adSyncStatus:lastSync[0]?.status??"NEVER",
    adSyncAt:(lastSync[0]?.finishedAt??lastSync[0]?.startedAt)?.toISOString()??null,
    adSyncFailed:lastSync[0]?.failed??0,
    siteLatencyMs,
  };

  return <Dashboard
    user={{displayName:location.displayName,role:location.role}}
    siteId={location.siteId}
    assets={liveAssets}
    online={online}
    summary={summary}
    location={{site:location.siteName??"Lokasyon",province:location.provinceName??"İl"}}
  />;
}

async function loadSiteSnapshot(siteId:string,url:string,networkCategoryIds:string[]){
  return withSiteDb(siteId,url,async db=>{
    const [assetRows,assignmentRows,totalRows,networkRows,attentionRows]=await Promise.all([
      db.select({id:assets.id,name:assets.name,model:assets.model,brand:assets.brand,code:assets.assetCode,categoryId:assets.categoryId,status:assets.status,roomId:assets.roomId,updatedAt:assets.updatedAt})
        .from(assets).orderBy(desc(assets.updatedAt)).limit(100),
      db.select({value:count()}).from(assignments).where(eq(assignments.status,"ACTIVE")),
      db.select({value:count()}).from(assets),
      networkCategoryIds.length?db.select({value:count()}).from(assets).where(inArray(assets.categoryId,networkCategoryIds)):Promise.resolve([{value:0}]),
      db.select({value:count()}).from(assets).where(or(eq(assets.status,"MAINTENANCE"),eq(assets.status,"LOST"))),
    ]);
    return {
      assets:assetRows,
      activeAssignments:Number(assignmentRows[0]?.value??0),
      totalAssets:Number(totalRows[0]?.value??0),
      networkAssets:Number(networkRows[0]?.value??0),
      attentionAssets:Number(attentionRows[0]?.value??0),
    };
  });
}

async function enrichAssets(rows:Awaited<ReturnType<typeof loadSiteSnapshot>>["assets"],categories:Array<{id:string;name:string;group:"OFFICE"|"NETWORK"}>){
  const roomIds=[...new Set(rows.flatMap(row=>row.roomId?[row.roomId]:[]))];
  const roomRows=roomIds.length?await controlDb.select({id:rooms.id,name:rooms.name}).from(rooms).where(inArray(rooms.id,roomIds)):[];
  const categoryMap=new Map(categories.map(category=>[category.id,category]));
  const roomMap=new Map(roomRows.map(room=>[room.id,room.name]));
  return rows.map(row=>({
    id:row.id,name:row.name,meta:[row.brand,row.model].filter(Boolean).join(" ")||"—",code:row.code,
    category:categoryMap.get(row.categoryId)?.name??"Diğer",group:categoryMap.get(row.categoryId)?.group??"OFFICE",
    place:row.roomId?roomMap.get(row.roomId)??"Tanımsız oda":"Konum belirtilmemiş",status:row.status,
    updatedAt:row.updatedAt.toISOString(),
  }));
}
