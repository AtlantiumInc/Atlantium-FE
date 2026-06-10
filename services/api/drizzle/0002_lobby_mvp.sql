CREATE TYPE "public"."membership_tier" AS ENUM('free', 'club', 'club_annual');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."lobby_room_type" AS ENUM('lounge', 'office_hours');--> statement-breakpoint
CREATE TYPE "public"."lobby_event_status" AS ENUM('scheduled', 'live', 'cancelled', 'ended');--> statement-breakpoint
CREATE TYPE "public"."lobby_room_role" AS ENUM('moderator');--> statement-breakpoint
CREATE TABLE "memberships" (
	"user_id" text PRIMARY KEY NOT NULL,
	"membership_tier" "membership_tier" DEFAULT 'free' NOT NULL,
	"subscription_status" "membership_status",
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"grace_period_end" timestamp with time zone,
	"payment_method" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobby_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "lobby_room_type" NOT NULL,
	"livekit_room_name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobby_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"status" "lobby_event_status" DEFAULT 'scheduled' NOT NULL,
	"livekit_room_name" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobby_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lobby_event_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"publish_granted" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lobby_room_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "lobby_room_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_events" ADD CONSTRAINT "lobby_events_room_id_lobby_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."lobby_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_messages" ADD CONSTRAINT "lobby_messages_room_id_lobby_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."lobby_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_messages" ADD CONSTRAINT "lobby_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_event_attendance" ADD CONSTRAINT "lobby_event_attendance_event_id_lobby_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."lobby_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_event_attendance" ADD CONSTRAINT "lobby_event_attendance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_room_roles" ADD CONSTRAINT "lobby_room_roles_room_id_lobby_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."lobby_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_room_roles" ADD CONSTRAINT "lobby_room_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_tier_idx" ON "memberships" USING btree ("membership_tier");--> statement-breakpoint
CREATE INDEX "memberships_status_idx" ON "memberships" USING btree ("subscription_status");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_rooms_slug_unique" ON "lobby_rooms" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_rooms_livekit_room_unique" ON "lobby_rooms" USING btree ("livekit_room_name");--> statement-breakpoint
CREATE INDEX "lobby_rooms_active_idx" ON "lobby_rooms" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "lobby_events_room_starts_idx" ON "lobby_events" USING btree ("room_id","starts_at");--> statement-breakpoint
CREATE INDEX "lobby_events_starts_idx" ON "lobby_events" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_events_livekit_room_unique" ON "lobby_events" USING btree ("livekit_room_name");--> statement-breakpoint
CREATE INDEX "lobby_messages_room_created_idx" ON "lobby_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "lobby_messages_user_created_idx" ON "lobby_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_event_attendance_event_user_unique" ON "lobby_event_attendance" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "lobby_event_attendance_user_joined_idx" ON "lobby_event_attendance" USING btree ("user_id","joined_at");--> statement-breakpoint
CREATE INDEX "lobby_event_attendance_user_publish_idx" ON "lobby_event_attendance" USING btree ("user_id","publish_granted","joined_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lobby_room_roles_room_user_role_unique" ON "lobby_room_roles" USING btree ("room_id","user_id","role");--> statement-breakpoint
CREATE INDEX "lobby_room_roles_user_role_idx" ON "lobby_room_roles" USING btree ("user_id","role");--> statement-breakpoint
INSERT INTO "lobby_rooms" ("slug", "name", "type", "livekit_room_name", "description", "metadata")
VALUES
  ('lounge', 'Lobby Lounge', 'lounge', 'atlantium-lobby-lounge', 'Always-on member lobby chat and hangout space.', '{"seeded": true}'::jsonb),
  ('office-hours', 'Office Hours', 'office_hours', 'atlantium-office-hours', 'Daily live office hours room.', '{"seeded": true}'::jsonb)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "lobby_events" ("room_id", "title", "description", "starts_at", "ends_at", "timezone", "status", "livekit_room_name", "metadata")
SELECT
  room.id,
  'Daily Office Hours',
  'Open technical help, project review, and live collaboration for Atlantium members.',
  office_hour.starts_at,
  office_hour.starts_at + interval '1 hour',
  'America/New_York',
  'scheduled',
  'atlantium-office-hours-' || to_char(office_hour.starts_at AT TIME ZONE 'America/New_York', 'YYYY-MM-DD'),
  '{"seeded": true, "recurrence": "daily", "local_start": "12:00"}'::jsonb
FROM "lobby_rooms" room
CROSS JOIN LATERAL (
  SELECT ((date_trunc('day', now() AT TIME ZONE 'America/New_York') + (day_offset * interval '1 day') + time '12:00') AT TIME ZONE 'America/New_York') AS starts_at
  FROM generate_series(0, 29) AS day_offset
) office_hour
WHERE room.slug = 'office-hours'
ON CONFLICT ("livekit_room_name") DO NOTHING;
