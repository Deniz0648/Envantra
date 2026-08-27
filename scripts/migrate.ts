import { migrate } from "drizzle-orm/node-postgres/migrator";
import { controlDb, controlPool } from "../src/db/control";
import { closeAllSitePools, getSitePool } from "../src/db/site-manager";

const host1=process.env.MIGRATION_SITE_DB_HOST_1??"localhost:54321";const host2=process.env.MIGRATION_SITE_DB_HOST_2??"localhost:54322";
const siteDatabases=[
  ["maslak",`postgresql://envantra:envantra@${host1}/site_maslak`],["ddc",`postgresql://envantra:envantra@${host1}/site_ddc`],["telcubuk",`postgresql://envantra:envantra@${host1}/site_telcubuk`],["dna",`postgresql://envantra:envantra@${host1}/site_dna`],["dilerlimani",`postgresql://envantra:envantra@${host1}/site_dilerlimani`],
  ["yazici",`postgresql://envantra:envantra@${host2}/site_yazici`],["atlas",`postgresql://envantra:envantra@${host2}/site_atlas`],["cornelia",`postgresql://envantra:envantra@${host2}/site_cornelia`],["cornelia-deluxe",`postgresql://envantra:envantra@${host2}/site_cornelia_deluxe`],["dim-hes",`postgresql://envantra:envantra@${host2}/site_dim_hes`],
] as const;
async function main(){
  try{
    await migrate(controlDb,{migrationsFolder:"drizzle/control"});
    const settled=await Promise.allSettled(siteDatabases.map(async([id,url])=>migrate(getSitePool(id,url).db,{migrationsFolder:"drizzle/site"})));
    const failed=settled.filter(result=>result.status==="rejected");
    if(failed.length)throw new Error(`${failed.length} lokasyon migration işlemi başarısız.`);
    console.log("Kontrol ve lokasyon migration işlemleri tamamlandı.");
  }finally{
    await closeAllSitePools();
    await controlPool.end();
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1});
