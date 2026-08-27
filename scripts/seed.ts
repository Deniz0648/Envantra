import { hash } from "bcryptjs";
import { controlDb, controlPool } from "../src/db/control";
import { appUsers, assetCategories, ownerCompanies, provinces, siteConnections, sites, userScopes } from "../src/db/control-schema";
import { encryptSiteConnection } from "../src/lib/secrets";

const provinceData=[{name:"İstanbul",code:"IS",sites:[["Maslak","MAS"]]},{name:"Kocaeli",code:"KO",sites:[["DDC","DDC"],["Tel Çubuk","TEL"],["DNA","DNA"],["Diler Limanı","LIM"]]},{name:"Hatay",code:"HT",sites:[["Yazıcı","YAZ"],["Atlas","ATL"]]},{name:"Antalya",code:"ANT",sites:[["Cornelia","COR"],["Cornelia De Luxe","CDL"],["DİM HES","DIM"]]}] as const;
const siteDbHost1=process.env.MIGRATION_SITE_DB_HOST_1??"site-db-1:5432";
const siteDbHost2=process.env.MIGRATION_SITE_DB_HOST_2??"site-db-2:5432";
const dbMap:Record<string,string>={MAS:`postgresql://envantra:envantra@${siteDbHost1}/site_maslak`,DDC:`postgresql://envantra:envantra@${siteDbHost1}/site_ddc`,TEL:`postgresql://envantra:envantra@${siteDbHost1}/site_telcubuk`,DNA:`postgresql://envantra:envantra@${siteDbHost1}/site_dna`,LIM:`postgresql://envantra:envantra@${siteDbHost1}/site_dilerlimani`,YAZ:`postgresql://envantra:envantra@${siteDbHost2}/site_yazici`,ATL:`postgresql://envantra:envantra@${siteDbHost2}/site_atlas`,COR:`postgresql://envantra:envantra@${siteDbHost2}/site_cornelia`,CDL:`postgresql://envantra:envantra@${siteDbHost2}/site_cornelia_deluxe`,DIM:`postgresql://envantra:envantra@${siteDbHost2}/site_dim_hes`};
const categories=[
  ["OFFICE","Masaüstü bilgisayar","desktop","PC",true,"computer"],["OFFICE","Notebook","notebook","NBK",true,"computer"],["OFFICE","Tablet","tablet","TAB",true,"mobile"],["OFFICE","Cep telefonu","mobile-phone","TEL",true,"mobile"],["OFFICE","Monitör","monitor","MON",true,"generic"],["OFFICE","Yazıcı","printer","PRN",false,"printer"],["OFFICE","Tarayıcı","scanner","SCN",false,"generic"],["OFFICE","Barkod okuyucu","barcode-reader","BCR",true,"generic"],["OFFICE","Docking station","dock","DOC",true,"generic"],["OFFICE","Harici cihaz","external-device","EXT",true,"generic"],["OFFICE","Çevre birimi","peripheral","PER",true,"generic"],["OFFICE","Diğer","other-office","OTH",false,"generic"],
  ["NETWORK","IP kamera","ip-camera","CAM",false,"network"],["NETWORK","IP telefon","ip-phone","IPT",false,"network"],["NETWORK","Router","router","RTR",false,"network"],["NETWORK","Access point","access-point","AP",false,"network"],["NETWORK","Switch","switch","SW",false,"network"],["NETWORK","Firewall","firewall","FW",false,"network"],["NETWORK","UPS","ups","UPS",false,"network"],["NETWORK","NVR","nvr","NVR",false,"network"],["NETWORK","DVR","dvr","DVR",false,"network"],["NETWORK","Kablosuz köprü/PTP","ptp","PTP",false,"network"],["NETWORK","Modem","modem","MDM",false,"network"],["NETWORK","Diğer ağ cihazı","other-network","NET",false,"network"],
] as const;
async function main(){
  try{
    for(const p of provinceData){const [province]=await controlDb.insert(provinces).values({name:p.name,code:p.code}).onConflictDoUpdate({target:provinces.code,set:{name:p.name,isActive:true}}).returning();if(!province)continue;for(const [name,code] of p.sites){const [site]=await controlDb.insert(sites).values({name,code,provinceId:province.id}).onConflictDoUpdate({target:sites.code,set:{name,provinceId:province.id,isActive:true}}).returning();if(site){const connectionUrl=dbMap[code];if(!connectionUrl)throw new Error(`${code} için lokasyon veritabanı adresi tanımlı değil.`);const securedUrl=encryptSiteConnection(connectionUrl);await controlDb.insert(siteConnections).values({siteId:site.id,encryptedUrl:securedUrl}).onConflictDoUpdate({target:siteConnections.siteId,set:{encryptedUrl:securedUrl}})}}}
    await controlDb.insert(ownerCompanies).values([{name:"Diler Holding",code:"DHL"},{name:"Diler Demir Çelik",code:"DDC"},{name:"Diler Elektrik",code:"DEL"}]).onConflictDoNothing();
    for(const [group,name,slug,code,isAssignable,formKind] of categories)await controlDb.insert(assetCategories).values({group,name,slug,code,isAssignable,formKind}).onConflictDoNothing();
    const [admin]=await controlDb.insert(appUsers).values({username:"admin",displayName:"Sistem Yöneticisi",email:"admin@devad.test",passwordHash:await hash("Envantra!2026",12),role:"ADMIN"}).onConflictDoUpdate({target:appUsers.username,set:{isActive:true}}).returning();
    if(admin)await controlDb.insert(userScopes).values({userId:admin.id,type:"GLOBAL"}).onConflictDoNothing();
    console.log("Başlangıç verileri yüklendi. Geliştirme kullanıcısı: admin");
  }finally{
    await controlPool.end();
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1});
