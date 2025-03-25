import { authedProcedure, router } from "./trpc";
import * as v from "valibot";
import { db } from "~/db";
import { upload, tag } from "~/db/schema";
import { eq, sql } from "drizzle-orm";

export const detail = router({
  getFile: authedProcedure("detail")
    .input(v.object({ id: v.number() }))
    .query(async ({ input }) => {
      const result = db
        .select({
          upload,
          tags: sql<string>`group_concat(${tag.value})`.as("tags"),
        })
        .from(upload)
        .where(eq(upload.id, input.id))
        .leftJoin(tag, eq(upload.id, tag.uploadId))
        .groupBy(upload.id)
        .get();

      if (!result) {
        return null;
      }

      return {
        id: result.upload.id,
        name: result.upload.name,
        description: result.upload.description,
        mime: result.upload.mime,
        created: result.upload.created,
        tags: result.tags?.split(",") || [],
      };
    }),

  updateFile: authedProcedure("detail")
    .input(
      v.object({
        id: v.number(),
        name: v.string(),
        description: v.string(),
        tags: v.array(v.string()),
      }),
    )
    .mutation(async ({ input }) => {
      // Update the file details
      db.update(upload)
        .set({
          name: input.name,
          description: input.description,
        })
        .where(eq(upload.id, input.id))
        .run();

      // Delete existing tags
      db.delete(tag).where(eq(tag.uploadId, input.id)).run();

      // Insert new tags if any
      if (input.tags.length > 0) {
        const tagInserts = input.tags.map((value) => ({
          value,
          uploadId: input.id,
        }));

        db.insert(tag).values(tagInserts).run();
      }

      return { success: true };
    }),
});
