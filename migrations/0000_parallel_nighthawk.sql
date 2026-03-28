CREATE TYPE "public"."alert_severity" AS ENUM('critical', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('Online', 'Warning', 'Offline', 'Maintenance');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('Solar', 'Wind', 'BESS', 'Hydro');--> statement-breakpoint
CREATE TYPE "public"."dispatch_status" AS ENUM('dispatched', 'curtailed', 'standby');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('Critical', 'High', 'Medium', 'Low');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('operator', 'engineer', 'manager', 'admin');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(32) NOT NULL,
	"asset_id" integer NOT NULL,
	"asset_name" text NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"location" text NOT NULL,
	"capacity" integer NOT NULL,
	"status" "asset_status" DEFAULT 'Online' NOT NULL,
	"performance_ratio" real NOT NULL,
	"last_communication" timestamp with time zone DEFAULT now() NOT NULL,
	"health_score" integer NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"installed_date" date NOT NULL,
	"inverter_count" integer NOT NULL,
	"current_output" integer NOT NULL,
	"daily_yield" integer NOT NULL,
	CONSTRAINT "assets_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "curtailment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"production" real NOT NULL,
	"curtailment" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"hour" integer NOT NULL,
	"day" varchar(3) NOT NULL,
	"status" "dispatch_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loss_breakdown" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"value" real NOT NULL,
	"percentage" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(32) NOT NULL,
	"asset_id" integer NOT NULL,
	"asset_name" text NOT NULL,
	"component" text NOT NULL,
	"predicted_failure_date" date NOT NULL,
	"confidence" real NOT NULL,
	"risk_level" "risk_level" NOT NULL,
	"recommended_action" text NOT NULL,
	CONSTRAINT "predictions_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "production_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"hour" varchar(8) NOT NULL,
	"production" real NOT NULL,
	"forecast" real NOT NULL,
	"recorded_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'operator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;