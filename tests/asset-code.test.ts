import { describe, expect, it } from "vitest";
import { formatAssetCode } from "../src/services/asset-code";
describe("ağ varlığı kodu",()=>{it("kodları normalize eder ve sırayı üç haneye tamamlar",()=>{expect(formatAssetCode({provinceCode:"KO",siteCode:"DDC",rackCode:"KB01",categoryCode:"SW"},1)).toBe("KO-DDC-KB01-SW-001")});it("Türkçe karakterleri güvenli biçimde temizler",()=>{expect(formatAssetCode({provinceCode:"İS",siteCode:"Maslak",rackCode:"KB 2",categoryCode:"AP"},12)).toBe("IS-MASLAK-KB2-AP-012")})});
