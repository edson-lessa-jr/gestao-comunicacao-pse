CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `login` text NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `full_name` text NOT NULL,
  `role` text NOT NULL CHECK (`role` IN ('CONSULTA', 'COMUNICADOR', 'ADMIN')),
  `status` text DEFAULT 'ATIVO' NOT NULL CHECK (`status` IN ('ATIVO', 'INATIVO')),
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_login_uq` ON `users` (`login`);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_uq` ON `users` (`email`);
--> statement-breakpoint
CREATE TRIGGER `communications_assign_number`
AFTER INSERT ON `communications`
WHEN NEW.`number` = 0
BEGIN
  INSERT INTO `communication_counters` (`type`, `year`, `last_number`)
  VALUES (NEW.`type`, NEW.`year`, 1)
  ON CONFLICT (`type`, `year`) DO UPDATE SET `last_number` = `last_number` + 1;

  UPDATE `communications`
  SET
    `number` = (SELECT `last_number` FROM `communication_counters` WHERE `type` = NEW.`type` AND `year` = NEW.`year`),
    `rendered_message` = replace(
      NEW.`rendered_message`,
      '[NN]',
      printf('%02d', (SELECT `last_number` FROM `communication_counters` WHERE `type` = NEW.`type` AND `year` = NEW.`year`))
    )
  WHERE `id` = NEW.`id`;
END;
