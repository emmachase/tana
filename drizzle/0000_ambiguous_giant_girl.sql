-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `secret` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_token` (
	`id` text PRIMARY KEY NOT NULL,
	`expires` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `upload` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(127) NOT NULL,
	`filePath` text NOT NULL,
	`mime` text NOT NULL,
	`created` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`description` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`value` text NOT NULL,
	`uploadId` integer NOT NULL,
	FOREIGN KEY (`uploadId`) REFERENCES `upload`(`id`) ON UPDATE no action ON DELETE no action
);

*/