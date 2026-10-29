CREATE TABLE `ai_plan_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`prompt_summary` text NOT NULL,
	`raw_payload_json` text NOT NULL,
	`status` text DEFAULT 'PENDING_REVIEW' NOT NULL,
	`applied_metadata_json` text,
	`model_used` text DEFAULT 'gemini-2.5-flash' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ai_suggestions_event_id` ON `ai_plan_suggestions` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_ai_suggestions_status` ON `ai_plan_suggestions` (`status`);