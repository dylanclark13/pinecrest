ALTER TABLE `round_holes` ADD `tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `club_levels` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
UPDATE players SET tokens=CAST(xp / 10 AS INTEGER),club_levels=json_object('driver',equipped,'3wood',equipped,'5iron',equipped,'7iron',equipped,'9iron',equipped,'pw',equipped,'sw',equipped,'putter',equipped);
