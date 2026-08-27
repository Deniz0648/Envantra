import { describe, expect, it } from "vitest";
import { createPhoneUserSchema } from "../src/validation/assignments";
import { createAppUserSchema } from "../src/validation/users";
import { createAssetSchema } from "../src/validation/assets";

const id="00000000-0000-4000-8000-000000000001";
describe("iş kuralı doğrulamaları",()=>{
  it("telefon için personel veya ortak oda seçeneklerinden tam birini zorunlu tutar",()=>{const base={siteId:id,assetId:id,startDate:"2026-08-27",isPrimary:true};expect(createPhoneUserSchema.safeParse({...base,profileId:id,sharedRoomId:id}).success).toBe(false);expect(createPhoneUserSchema.safeParse(base).success).toBe(false);expect(createPhoneUserSchema.safeParse({...base,profileId:id}).success).toBe(true)});
  it("il kapsamına provinceId olmadan izin vermez",()=>{const result=createAppUserSchema.safeParse({adProfileId:id,role:"VIEWER",password:"Guvenli!123",scopes:[{type:"PROVINCE"}]});expect(result.success).toBe(false)});
  it("ayrıntılı donanım bileşeni alanlarını varlık modeline almaz",()=>{const result=createAssetSchema.parse({siteId:id,categoryId:id,ownerCompanyId:id,provinceId:id,name:"Test notebook",status:"DRAFT",ram:"32 GB",disk:"1 TB",details:{kind:"computer",hostname:"NB-01"}});expect("ram" in result).toBe(false);expect("disk" in result).toBe(false)});
});
