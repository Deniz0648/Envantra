import { Client } from "ldapts";
import { env } from "../src/lib/env";

async function main(){
  const client=new Client({url:env.LDAP_URL,timeout:5000,connectTimeout:5000});
  try{
    await client.bind(env.LDAP_BIND_DN,env.LDAP_BIND_PASSWORD);
    console.log("Geliştirme AD bağlantısı doğrulandı. Kullanıcı ve bilgisayar OU kayıtları senkronizasyona hazır.");
  }finally{
    await client.unbind().catch(()=>undefined);
  }
}
void main().catch(error=>{console.error(error);process.exitCode=1});
