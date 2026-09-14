CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`verifier` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`saved` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `sessions` (`expires`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`login` text NOT NULL,
	`name` text NOT NULL,
	`avatar` text NOT NULL,
	`joined` integer NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`card` text,
	`published` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_login` ON `users` (`login`);--> statement-breakpoint
CREATE TABLE `work_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`started` integer NOT NULL,
	`ended` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `work_user_start` ON `work_sessions` (`user_id`,`started`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_running_timer` ON `work_sessions` (`user_id`) WHERE "work_sessions"."ended" IS NULL;