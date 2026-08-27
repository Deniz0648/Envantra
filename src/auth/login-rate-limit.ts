import { AppError } from "@/src/lib/errors";

type Attempt={count:number;windowStartedAt:number;blockedUntil?:number};
const globalAttempts=globalThis as unknown as {envantraLoginAttempts?:Map<string,Attempt>};
const attempts=globalAttempts.envantraLoginAttempts??new Map<string,Attempt>();
globalAttempts.envantraLoginAttempts=attempts;
const windowMs=15*60*1000;const maxAttempts=5;
export function loginAttemptKey(request:Request,username:string):string{const forwarded=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();const ip=forwarded||request.headers.get("x-real-ip")||"unknown";return `${ip}:${username.toLocaleLowerCase("tr")}`}
export function assertLoginAllowed(key:string):void{const now=Date.now();const entry=attempts.get(key);if(!entry)return;if(entry.blockedUntil&&entry.blockedUntil>now)throw new AppError("RATE_LIMITED","Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.",429);if(now-entry.windowStartedAt>windowMs)attempts.delete(key)}
export function recordLoginFailure(key:string):void{const now=Date.now();const current=attempts.get(key);const entry:Attempt=!current||now-current.windowStartedAt>windowMs?{count:1,windowStartedAt:now}:{...current,count:current.count+1};if(entry.count>=maxAttempts)entry.blockedUntil=now+windowMs;attempts.set(key,entry)}
export function clearLoginFailures(key:string):void{attempts.delete(key)}
