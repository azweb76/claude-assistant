CREATE TABLE `agent_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`effort` text NOT NULL,
	`permission_mode` text NOT NULL,
	`allowed_tools` text,
	`disallowed_tools` text,
	`skills` text,
	`agents` text,
	`setting_sources` text NOT NULL,
	`max_turns` integer,
	`max_budget_usd` real,
	`extra_system_prompt` text,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`model` text NOT NULL,
	`effort` text NOT NULL,
	`summary` text,
	`session_ids` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`ended_at` text
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`seq` integer NOT NULL,
	`type` text NOT NULL,
	`subtype` text,
	`payload` text NOT NULL,
	`tokens` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_messages_session_seq_unique` ON `session_messages` (`session_id`,`seq`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`profile_snapshot` text NOT NULL,
	`prompt` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sdk_session_id` text,
	`branch_name` text,
	`pr_url` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`total_cost_usd` real,
	`num_turns` integer,
	`started_at` text,
	`ended_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `agent_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staged_improvements` (
	`id` text PRIMARY KEY NOT NULL,
	`analysis_id` text NOT NULL,
	`category` text NOT NULL,
	`scope` text NOT NULL,
	`workspace_id` text,
	`target_path` text NOT NULL,
	`rationale` text NOT NULL,
	`current_content` text NOT NULL,
	`proposed_content` text NOT NULL,
	`diff` text NOT NULL,
	`status` text DEFAULT 'staged' NOT NULL,
	`applied_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`analysis_id`) REFERENCES `analyses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`remote` text NOT NULL,
	`owner` text NOT NULL,
	`repo` text NOT NULL,
	`default_branch` text NOT NULL,
	`local_path` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_remote_unique` ON `workspaces` (`remote`);