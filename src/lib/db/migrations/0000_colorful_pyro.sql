CREATE TABLE `budget_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`allocated_paise` integer DEFAULT 0 NOT NULL,
	`estimated_paise` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `event_budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_categories_event_id` ON `budget_categories` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_categories_budget_id` ON `budget_categories` (`budget_id`);--> statement-breakpoint
CREATE TABLE `event_budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`total_budget_paise` integer NOT NULL,
	`contingency_paise` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_budgets_event_id_unique` ON `event_budgets` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_budgets_event_id` ON `event_budgets` (`event_id`);--> statement-breakpoint
CREATE TABLE `event_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text DEFAULT 'GENERAL' NOT NULL,
	`status` text DEFAULT 'TODO' NOT NULL,
	`priority` text DEFAULT 'MEDIUM' NOT NULL,
	`due_date` text,
	`assigned_to` text,
	`is_ai_suggested` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_event_id` ON `event_tasks` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `event_tasks` (`status`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'usr_demo' NOT NULL,
	`title` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text DEFAULT 'PLANNING' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`target_guest_count` integer DEFAULT 100 NOT NULL,
	`venue_name` text,
	`venue_city` text DEFAULT 'Ahmedabad' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_user_id` ON `events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_events_start_date` ON `events` (`start_date`);