CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`player_id` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_player_id_unique` ON `accounts` (`player_id`);--> statement-breakpoint
CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_account` ON `sessions` (`account_id`);--> statement-breakpoint
ALTER TABLE `players` ADD `display_name` text DEFAULT 'Golfer' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `appearance` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `onboarded` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_rounds_records` ON `rounds` (`status`,`course`,`mode`);
--> statement-breakpoint
UPDATE players SET onboarded=1 WHERE holes>0;
