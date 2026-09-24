CREATE TABLE `daily_rewards` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`tokens` integer NOT NULL,
	`round_id` text NOT NULL,
	`receipt` text NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
--> statement-breakpoint
ALTER TABLE `round_holes` ADD `putts` integer;--> statement-breakpoint
ALTER TABLE `round_holes` ADD `fairway` integer;--> statement-breakpoint
ALTER TABLE `round_holes` ADD `gir` integer;--> statement-breakpoint
ALTER TABLE `rounds` ADD `daily_day` text;