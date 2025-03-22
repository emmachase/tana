import { sqliteTable, text, numeric, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const secret = sqliteTable("secret", {
  key: text().primaryKey().notNull(),
  value: text().notNull(),
});

export const refreshToken = sqliteTable("refresh_token", {
  id: text().primaryKey().notNull(),
  expires: numeric().notNull(),
});

export const upload = sqliteTable("upload", {
  id: integer().primaryKey({ autoIncrement: true }).notNull(),
  name: text({ length: 127 }).notNull(),
  filePath: text().notNull(),
  mime: text().notNull(),
  created: numeric()
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  description: text().notNull(),
});

export const tag = sqliteTable("tag", {
  id: integer().primaryKey({ autoIncrement: true }).notNull(),
  value: text().notNull(),
  uploadId: integer()
    .notNull()
    .references(() => upload.id),
});
