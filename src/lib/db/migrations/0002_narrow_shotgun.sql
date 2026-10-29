CREATE TABLE `event_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`actor_id` text DEFAULT 'usr_demo' NOT NULL,
	`action_type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`change_summary` text NOT NULL,
	`previous_values_json` text,
	`new_values_json` text,
	`findings_summary_json` text,
	`approved_actions_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_activities_event_id` ON `event_activities` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_activities_created_at` ON `event_activities` (`created_at`);--> statement-breakpoint
ALTER TABLE `events` ADD `version` integer DEFAULT 1 NOT NULL;