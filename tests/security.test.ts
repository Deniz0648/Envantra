import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assertLoginAllowed, clearLoginFailures, recordLoginFailure } from "../src/auth/login-rate-limit";
import { decryptSiteConnection, encryptSiteConnection } from "../src/lib/secrets";

describe("güvenlik yardımcıları",()=>{
  it("lokasyon bağlantı bilgisini saklama biçiminden geri çözer",()=>{const value="postgresql://user:secret@db.internal/site";const stored=encryptSiteConnection(value);expect(stored).not.toBe(value);expect(decryptSiteConnection(stored)).toBe(value)});
  it("beş başarısız denemeden sonra giriş anahtarını sınırlar",()=>{const key=`test-${randomUUID()}`;for(let index=0;index<5;index++){assertLoginAllowed(key);recordLoginFailure(key)}expect(()=>assertLoginAllowed(key)).toThrow(/fazla başarısız/i);clearLoginFailures(key);expect(()=>assertLoginAllowed(key)).not.toThrow()});
});
