import { doublePrecision, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Bumped on password change / logout-everywhere; tokens carry the version they were issued with.
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per property. Everything except photos lives in `data` (see lib/types Property). */
export const properties = pgTable(
  "properties",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default(""),
    city: text("city").notNull().default(""),
    district: text("district").notNull().default(""),
    kind: text("kind").notNull().default("land"),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("properties_updated_idx").on(t.updatedAt)],
);

/** Photos are stored separately so autosaving property data stays small. */
export const photos = pgTable(
  "photos",
  {
    id: serial("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    group: text("group").notNull().default("property"), // property | building
    position: integer("position").notNull().default(0),
    mime: text("mime").notNull().default("image/jpeg"),
    base64: text("base64").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("photos_property_idx").on(t.propertyId)],
);

/** Market evidence: deals and listings used in the price-comparison tables. */
export const comparables = pgTable(
  "comparables",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(), // land | building | rent
    dealType: text("deal_type").notNull().default("deal"), // deal | offer
    city: text("city").notNull().default(""),
    district: text("district").notNull().default(""),
    description: text("description").notNull().default(""),
    area: doublePrecision("area").notNull(),
    price: doublePrecision("price").notNull(), // total price, or annual rent for category=rent
    date: text("date").notNull().default(""),
    source: text("source").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comparables_city_idx").on(t.city, t.district)],
);

export const landmarks = pgTable("landmarks", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type ComparableRow = typeof comparables.$inferSelect;
export type LandmarkRow = typeof landmarks.$inferSelect;
