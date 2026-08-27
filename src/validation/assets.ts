import { z } from "zod";

const uuid = z.string().uuid();
const ipAddress = z.union([z.ipv4(), z.ipv6()]);
const common = z.object({
  siteId: uuid, categoryId: uuid, ownerCompanyId: uuid, provinceId: uuid, buildingId: uuid.optional(), floorId: uuid.optional(), roomId: uuid.optional(),
  name: z.string().trim().min(2).max(160), brand: z.string().trim().max(100).optional(), model: z.string().trim().max(100).optional(),
  serialNumber: z.string().trim().max(120).optional(), inventoryNumber: z.string().trim().max(120).optional(),
  status: z.enum(["DRAFT", "IN_STOCK", "IN_USE", "MAINTENANCE", "RETIRED", "LOST", "ARCHIVED"]), description: z.string().max(2000).optional(),
});
const details = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("computer"), hostname: z.string().max(255).optional(), operatingSystem: z.string().max(160).optional() }),
  z.object({ kind: z.literal("mobile"), imei1: z.string().regex(/^\d{15}$/).optional(), imei2: z.string().regex(/^\d{15}$/).optional(), phoneNumber: z.string().max(30).optional(), lineNumber: z.string().max(30).optional(), operatingSystem: z.string().max(160).optional() }),
  z.object({ kind: z.literal("printer"), ipAddress: ipAddress.optional(), macAddress: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).optional(), printerName: z.string().max(160).optional(), connectionType: z.string().max(50).optional(), isNetworkPrinter: z.boolean() }),
  z.object({ kind: z.literal("network"), rackId: uuid, rackUnit: z.number().int().min(1).max(100).optional(), ipAddress: ipAddress.optional(), macAddress: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/).optional(), managementAddress: z.string().max(255).optional(), hostname: z.string().max(255).optional(), installationPoint: z.string().max(500).optional(), responsibleProfileId: uuid.optional() }),
  z.object({ kind: z.literal("generic") }),
]);
export const createAssetSchema = common.extend({ details });
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export const updateAssetSchema=common.partial().extend({siteId:uuid,details:details.optional()});
export const assetRelationSchema=z.object({siteId:uuid,targetAssetId:uuid,type:z.enum(["CONNECTED_TO","INSTALLED_IN","POWERED_BY","RECORDED_BY","PARENT_OF","ACCESSORY_OF"])});
