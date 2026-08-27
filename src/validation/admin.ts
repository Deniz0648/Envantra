import { z } from "zod";
const uuid=z.string().uuid();const name=z.string().trim().min(2).max(160);const code=z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/);
export const categoryCreateSchema=z.object({group:z.enum(["OFFICE","NETWORK"]),name,slug:z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/),code:code.optional(),isAssignable:z.boolean().default(false),formKind:z.enum(["generic","computer","mobile","printer","network"]).default("generic")});
export const categoryUpdateSchema=categoryCreateSchema.partial().extend({isActive:z.boolean().optional()});
export const locationCreateSchema=z.discriminatedUnion("entity",[
  z.object({entity:z.literal("province"),name,code}),
  z.object({entity:z.literal("site"),provinceId:uuid,name,code,connectionUrl:z.string().url().optional()}),
  z.object({entity:z.literal("building"),siteId:uuid,name,code}),
  z.object({entity:z.literal("floor"),buildingId:uuid,name,code}),
  z.object({entity:z.literal("room"),floorId:uuid,name,code}),
  z.object({entity:z.literal("rack"),siteId:uuid,roomId:uuid,number:z.string().trim().min(1).max(30),name,shortCode:code,description:z.string().max(1000).optional()}),
]);
export const locationUpdateSchema=z.object({entity:z.enum(["province","site","building","floor","room","rack"]),id:uuid,name:name.optional(),code:code.optional(),number:z.string().trim().min(1).max(30).optional(),shortCode:code.optional(),description:z.string().max(1000).nullable().optional(),isActive:z.boolean().optional()});
export const companyCreateSchema=z.object({name,code});
export const companyUpdateSchema=companyCreateSchema.partial().extend({isActive:z.boolean().optional()});
