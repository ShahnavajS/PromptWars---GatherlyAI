CREATE TABLE `event_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`cultural_preset` text DEFAULT 'MODERN' NOT NULL,
	`dietary_preference` text DEFAULT 'MIXED' NOT NULL,
	`ceremony_options_json` text,
	`accessibility_notes` text,
	`decor_style` text,
	`entertainment_style` text,
	`custom_traditions_json` text,
	`venue_capacity_max` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_preferences_event_id_unique` ON `event_preferences` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_preferences_event_id` ON `event_preferences` (`event_id`);--> statement-breakpoint
CREATE TABLE `event_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`day_number` integer DEFAULT 1 NOT NULL,
	`date` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` text,
	`end_time` text,
	`is_all_day` integer DEFAULT false NOT NULL,
	`location` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`depends_on_schedule_id` text,
	`is_ai_suggested` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_schedules_event_id` ON `event_schedules` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_schedules_date` ON `event_schedules` (`date`);--> statement-breakpoint
CREATE TABLE `vendor_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`requirement_id` text,
	`category_id` text,
	`quote_title` text NOT NULL,
	`quoted_amount_paise` integer NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`quote_date` text NOT NULL,
	`valid_until_date` text,
	`status` text DEFAULT 'RECEIVED' NOT NULL,
	`inclusions_json` text,
	`exclusions_json` text,
	`payment_terms_json` text,
	`cancellation_policy` text,
	`notes` text,
	`source_document_name` text,
	`is_extracted_by_ai` integer DEFAULT false NOT NULL,
	`confirmed_commitment` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requirement_id`) REFERENCES `vendor_requirements`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_quotes_event_id` ON `vendor_quotes` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_quotes_vendor_id` ON `vendor_quotes` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_quotes_status` ON `vendor_quotes` (`status`);--> statement-breakpoint
CREATE TABLE `vendor_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`specifications` text NOT NULL,
	`target_budget_paise` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_requirements_event_id` ON `vendor_requirements` (`event_id`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`contact_name` text,
	`contact_phone` text,
	`contact_email` text,
	`website` text,
	`city` text,
	`notes` text,
	`verification_status` text DEFAULT 'UNVERIFIED' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vendors_event_id` ON `vendors` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_vendors_category` ON `vendors` (`category`);--> statement-breakpoint
ALTER TABLE `budget_categories` ADD `rate_provenance` text DEFAULT 'UNKNOWN_RATE' NOT NULL;--> statement-breakpoint
ALTER TABLE `budget_categories` ADD `unit_rate_paise` integer;--> statement-breakpoint
ALTER TABLE `event_tasks` ADD `deadline_provenance` text DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `venue_capacity_max` integer;