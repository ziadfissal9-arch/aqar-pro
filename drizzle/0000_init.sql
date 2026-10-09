CREATE TABLE "comparables" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"deal_type" text DEFAULT 'deal' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"district" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"area" double precision NOT NULL,
	"price" double precision NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"group" text DEFAULT 'property' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"mime" text DEFAULT 'image/jpeg' NOT NULL,
	"base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"district" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'land' NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comparables_city_idx" ON "comparables" USING btree ("city","district");--> statement-breakpoint
CREATE INDEX "photos_property_idx" ON "photos" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "properties_updated_idx" ON "properties" USING btree ("updated_at");