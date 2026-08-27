import { boolean, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const assetStatusEnum = pgEnum("asset_status", ["DRAFT", "IN_STOCK", "IN_USE", "MAINTENANCE", "RETIRED", "LOST", "ARCHIVED"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["ACTIVE", "RETURNED", "CANCELLED"]);
export const relationTypeEnum = pgEnum("relation_type", ["CONNECTED_TO", "INSTALLED_IN", "POWERED_BY", "RECORDED_BY", "PARENT_OF", "ACCESSORY_OF"]);

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(), assetCode: text("asset_code").notNull(), categoryId: uuid("category_id").notNull(),
  ownerCompanyId: uuid("owner_company_id").notNull(), provinceId: uuid("province_id").notNull(), siteId: uuid("site_id").notNull(),
  buildingId: uuid("building_id"), floorId: uuid("floor_id"), roomId: uuid("room_id"), name: text("name").notNull(),
  brand: text("brand"), model: text("model"), serialNumber: text("serial_number"), inventoryNumber: text("inventory_number"),
  status: assetStatusEnum("status").notNull().default("DRAFT"), description: text("description"), fromAd: boolean("from_ad").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (t) => [uniqueIndex("assets_code_uq").on(t.assetCode), index("assets_category_idx").on(t.categoryId), index("assets_status_idx").on(t.status)]);

export const computerDetails = pgTable("computer_details", {
  assetId: uuid("asset_id").primaryKey().references(() => assets.id, { onDelete: "cascade" }), hostname: text("hostname"), operatingSystem: text("operating_system"),
  adObjectGuid: text("ad_object_guid"), adDistinguishedName: text("ad_distinguished_name"), lastAdSyncAt: timestamp("last_ad_sync_at", { withTimezone: true }),
}, (t) => [uniqueIndex("computer_ad_guid_uq").on(t.adObjectGuid)]);
export const mobileDetails = pgTable("mobile_details", {
  assetId: uuid("asset_id").primaryKey().references(() => assets.id, { onDelete: "cascade" }), imei1: text("imei_1"), imei2: text("imei_2"),
  phoneNumber: text("phone_number"), lineNumber: text("line_number"), operatingSystem: text("operating_system"), userChangedAt: timestamp("user_changed_at", { withTimezone: true }),
});
export const printerDetails = pgTable("printer_details", {
  assetId: uuid("asset_id").primaryKey().references(() => assets.id, { onDelete: "cascade" }), ipAddress: text("ip_address"), macAddress: text("mac_address"),
  printerName: text("printer_name"), connectionType: text("connection_type"), isNetworkPrinter: boolean("is_network_printer").notNull().default(false), roomId: uuid("room_id"),
});
export const networkDetails = pgTable("network_details", {
  assetId: uuid("asset_id").primaryKey().references(() => assets.id, { onDelete: "cascade" }), ipAddress: text("ip_address"), macAddress: text("mac_address"),
  managementAddress: text("management_address"), hostname: text("hostname"), rackId: uuid("rack_id"), rackUnit: integer("rack_unit"),
  upstreamAssetId: uuid("upstream_asset_id").references((): typeof assets.id => assets.id), installationPoint: text("installation_point"), responsibleProfileId: uuid("responsible_profile_id"), notes: text("notes"),
}, (t) => [check("network_rack_unit_check", sql`${t.rackUnit} is null or ${t.rackUnit} between 1 and 100`) ]);

export const assetCodeSequences = pgTable("asset_code_sequences", {
  siteId: uuid("site_id").notNull(), rackId: uuid("rack_id").notNull(), categoryId: uuid("category_id").notNull(), nextValue: integer("next_value").notNull().default(1),
}, (t) => [primaryKey({ columns: [t.siteId, t.rackId, t.categoryId] })]);

export const assetRelations = pgTable("asset_relations", {
  id: uuid("id").primaryKey().defaultRandom(), sourceAssetId: uuid("source_asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  targetAssetId: uuid("target_asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }), type: relationTypeEnum("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("asset_relation_uq").on(t.sourceAssetId, t.targetAssetId, t.type), check("asset_relation_not_self", sql`${t.sourceAssetId} <> ${t.targetAssetId}`)]);

export const assignments = pgTable("assignments", {
  id: uuid("id").primaryKey().defaultRandom(), assetId: uuid("asset_id").notNull().references(() => assets.id), profileId: uuid("profile_id").notNull(),
  assignedByUserId: uuid("assigned_by_user_id").notNull(), assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  returnedAt: timestamp("returned_at", { withTimezone: true }), receivedByUserId: uuid("received_by_user_id"), notes: text("notes"),
  status: assignmentStatusEnum("status").notNull().default("ACTIVE"),
}, (t) => [index("assignments_profile_idx").on(t.profileId)]);
export const assignmentEvents = pgTable("assignment_events", {
  id: uuid("id").primaryKey().defaultRandom(), assignmentId: uuid("assignment_id").notNull().references(() => assignments.id),
  action: text("action").notNull(), actorId: uuid("actor_id").notNull(), details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const phoneUsers = pgTable("phone_users", {
  id: uuid("id").primaryKey().defaultRandom(), assetId: uuid("asset_id").notNull().references(() => assets.id), profileId: uuid("profile_id"),
  sharedRoomId: uuid("shared_room_id"), extension: text("extension"), phoneNumber: text("phone_number"), startDate: date("start_date").notNull(), endDate: date("end_date"),
  assignedByUserId: uuid("assigned_by_user_id").notNull(), notes: text("notes"), isPrimary: boolean("is_primary").notNull().default(true), isActive: boolean("is_active").notNull().default(true),
}, (t) => [check("phone_user_target_check", sql`(${t.profileId} is not null) <> (${t.sharedRoomId} is not null)`)]);

export const assetMovements = pgTable("asset_movements", {
  id: uuid("id").primaryKey().defaultRandom(), assetId: uuid("asset_id").notNull().references(() => assets.id), type: text("type").notNull(),
  oldAssetCode: text("old_asset_code"), newAssetCode: text("new_asset_code"), actorId: uuid("actor_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const siteAuditLogs = pgTable("site_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(), actorId: uuid("actor_id"), action: text("action").notNull(), entityType: text("entity_type").notNull(),
  entityId: text("entity_id"), metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("site_audit_created_idx").on(t.createdAt)]);
