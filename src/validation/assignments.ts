import { z } from "zod";
const uuid=z.string().uuid();
export const createAssignmentSchema=z.object({siteId:uuid,assetId:uuid,profileId:uuid,assignedAt:z.coerce.date().optional(),notes:z.string().trim().max(2000).optional()});
export const returnAssignmentSchema=z.object({siteId:uuid,receivedByUserId:uuid.optional(),returnedAt:z.coerce.date().optional(),notes:z.string().trim().max(2000).optional()});
export const createPhoneUserSchema=z.object({siteId:uuid,assetId:uuid,profileId:uuid.optional(),sharedRoomId:uuid.optional(),extension:z.string().trim().max(20).optional(),phoneNumber:z.string().trim().max(30).optional(),startDate:z.iso.date(),notes:z.string().trim().max(2000).optional(),isPrimary:z.boolean().default(true)}).refine(v=>(v.profileId?1:0)+(v.sharedRoomId?1:0)===1,{message:"Kullanıcı veya ortak kullanım odasından yalnızca biri seçilmelidir."});
export const closePhoneUserSchema=z.object({siteId:uuid,endDate:z.iso.date().optional(),notes:z.string().trim().max(2000).optional()});
