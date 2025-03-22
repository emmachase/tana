import { relations } from "drizzle-orm/relations";
import { upload, tag } from "./schema";

export const tagRelations = relations(tag, ({ one }) => ({
  upload: one(upload, {
    fields: [tag.uploadId],
    references: [upload.id],
  }),
}));

export const uploadRelations = relations(upload, ({ many }) => ({
  tags: many(tag),
}));
