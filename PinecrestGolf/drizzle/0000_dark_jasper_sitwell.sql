CREATE TABLE `round_holes` (
	`round_id` text NOT NULL,
	`hole` integer NOT NULL,
	`strokes` integer NOT NULL,
	`xp` integer NOT NULL,
	`receipt` text NOT NULL,
	PRIMARY KEY(`round_id`, `hole`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`user_id` text PRIMARY KEY NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`equipped` integer DEFAULT 0 NOT NULL,
	`holes` integer DEFAULT 0 NOT NULL,
	`rounds` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course` integer NOT NULL,
	`mode` text NOT NULL,
	`next_hole` integer NOT NULL,
	`end_hole` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rounds_user_status` ON `rounds` (`user_id`,`status`);