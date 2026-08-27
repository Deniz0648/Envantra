import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "IT_OPERATOR", "VIEWER", "AUDITOR"]);
export const scopeTypeEnum = pgEnum("scope_type", ["GLOBAL", "PROVINCE", "SITE"]);
export const assetGroupEnum = pgEnum("asset_group", ["OFFICE", "NETWORK"]);
export const syncStatusEnum = pgEnum("sync_status", ["RUNNING", "COMPLETED", "PARTIAL", "FAILED"]);

export const provinces = pgTable("provinces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), code: text("code").notNull(), isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("provinces_code_uq").on(t.code)]);

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(), provinceId: uuid("province_id").notNull().references(() => provinces.id),
  name: text("name").notNull(), code: text("code").notNull(), isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("sites_code_uq").on(t.code), index("sites_province_idx").on(t.provinceId)]);

export const buildings = pgTable("buildings", {
  id: uuid("id").primaryKey().defaultRandom(), siteId: uuid("site_id").notNull().references(() => sites.id),
  name: text("name").notNull(), code: text("code").notNull(), isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("buildings_site_code_uq").on(t.siteId, t.code)]);
export const floors = pgTable("floors", {
  id: uuid("id").primaryKey().defaultRandom(), buildingId: uuid("building_id").notNull().references(() => buildings.id),
  name: text("name").notNull(), code: text("code").notNull(), isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("floors_building_code_uq").on(t.buildingId, t.code)]);
export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(), floorId: uuid("floor_id").notNull().references(() => floors.id),
  name: text("name").notNull(), code: text("code").notNull(), isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("rooms_floor_code_uq").on(t.floorId, t.code)]);
export const racks = pgTable("racks", {
  id: uuid("id").primaryKey().defaultRandom(), siteId: uuid("site_id").notNull().references(() => sites.id),
  roomId: uuid("room_id").notNull().references(() => rooms.id), number: text("number").notNull(), name: text("name").notNull(),
  shortCode: text("short_code").notNull(), description: text("description"), isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("racks_site_short_code_uq").on(t.siteId, t.shortCode)]);

export const ownerCompanies = pgTable("owner_companies", {
  id: uuid("id").primaryKey().defaultRandom(), name: text("name").notNull(), code: text("code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("owner_companies_code_uq").on(t.code)]);

export const assetCategories = pgTable("asset_categories", {
  id: uuid("id").primaryKey().defaultRandom(), group: assetGroupEnum("group").notNull(), name: text("name").notNull(),
  slug: text("slug").notNull(), code: text("code"), isAssignable: boolean("is_assignable").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true), formKind: text("form_kind").notNull().default("generic"),
}, (t) => [uniqueIndex("asset_categories_slug_uq").on(t.slug), uniqueIndex("asset_categories_code_uq").on(t.code)]);

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(), username: text("username").notNull(), displayName: text("display_name").notNull(),
  email: text("email"), adProfileId: uuid("ad_profile_id"), passwordHash: text("password_hash").notNull(), role: roleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true), lastProvinceId: uuid("last_province_id").references(() => provinces.id),
  lastSiteId: uuid("last_site_id").references(() => sites.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("app_users_username_uq").on(t.username)]);

export const userScopes = pgTable("user_scopes", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  type: scopeTypeEnum("type").notNull(), provinceId: uuid("province_id").references(() => provinces.id), siteId: uuid("site_id").references(() => sites.id),
}, (t) => [uniqueIndex("user_scope_uq").on(t.userId, t.type, t.provinceId, t.siteId)]);

export const siteConnections = pgTable("site_connections", {
  siteId: uuid("site_id").primaryKey().references(() => sites.id), encryptedUrl: text("encrypted_url").notNull(),
  connectTimeoutMs: integer("connect_timeout_ms").notNull().default(3000), lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastFailureAt: timestamp("last_failure_at", { withTimezone: true }), latencyMs: integer("latency_ms"), lastErrorCode: text("last_error_code"),
});

export const adProfiles = pgTable("ad_profiles", {
  id: uuid("id").primaryKey().defaultRandom(), objectGuid: text("object_guid").notNull(), username: text("username").notNull(),
  displayName: text("display_name").notNull(), email: text("email"), department: text("department"), title: text("title"),
  company: text("company"), distinguishedName: text("distinguished_name").notNull(), isActive: boolean("is_active").notNull().default(true),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("ad_profiles_object_guid_uq").on(t.objectGuid), index("ad_profiles_username_idx").on(t.username)]);

export const adOuMappings = pgTable("ad_ou_mappings", {
  id: uuid("id").primaryKey().defaultRandom(), ouDn: text("ou_dn").notNull(), siteId: uuid("site_id").notNull().references(() => sites.id),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => [uniqueIndex("ad_ou_mappings_dn_uq").on(t.ouDn)]);
export const adSyncRuns = pgTable("ad_sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(), status: syncStatusEnum("status").notNull(), startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }), added: integer("added").notNull().default(0), updated: integer("updated").notNull().default(0),
  unchanged: integer("unchanged").notNull().default(0), unmatched: integer("unmatched").notNull().default(0), failed: integer("failed").notNull().default(0),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
});
export const unmatchedAdRecords=pgTable("unmatched_ad_records",{
  id:uuid("id").primaryKey().defaultRandom(),objectGuid:text("object_guid").notNull(),objectType:text("object_type").notNull(),name:text("name").notNull(),distinguishedName:text("distinguished_name").notNull(),reason:text("reason").notNull(),isResolved:boolean("is_resolved").notNull().default(false),resolvedSiteId:uuid("resolved_site_id").references(()=>sites.id),firstSeenAt:timestamp("first_seen_at",{withTimezone:true}).notNull().defaultNow(),lastSeenAt:timestamp("last_seen_at",{withTimezone:true}).notNull().defaultNow(),
},(t)=>[uniqueIndex("unmatched_ad_object_guid_uq").on(t.objectGuid),index("unmatched_ad_resolved_idx").on(t.isResolved)]);

export const centralAuditLogs = pgTable("central_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(), actorId: uuid("actor_id").references(() => appUsers.id), action: text("action").notNull(),
  entityType: text("entity_type").notNull(), entityId: text("entity_id"), siteId: uuid("site_id").references(() => sites.id),
  ipAddress: text("ip_address"), metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("central_audit_created_idx").on(t.createdAt)]);
