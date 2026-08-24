CREATE TABLE `communication_counters` (
	`type` text NOT NULL,
	`year` integer NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`type`, `year`)
);
--> statement-breakpoint
CREATE TABLE `communications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`year` integer NOT NULL,
	`number` integer NOT NULL,
	`status` text DEFAULT 'ATIVO' NOT NULL,
	`title` text NOT NULL,
	`fields_json` text NOT NULL,
	`rendered_message` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`cancelled_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `communications_type_year_number_uq` ON `communications` (`type`,`year`,`number`);