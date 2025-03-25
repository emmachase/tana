import { authedProcedure, router } from "./trpc";
import { db } from "~/db";
import { tag, upload } from "~/db/schema";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { unlink } from "fs/promises";
import { join } from "path";
import { env } from "~/env";

export const fileOps = router({
  rename: authedProcedure("list")
    .input(
      v.object({
        id: v.number(),
        newName: v.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, newName } = input;

      // Get the current file info
      const file = db.select().from(upload).where(eq(upload.id, id)).get();

      if (!file) {
        throw new Error("File not found");
      }

      // Update the file name in the database
      const updated = db
        .update(upload)
        .set({ name: newName })
        .where(eq(upload.id, id))
        .returning()
        .get();

      return updated;
    }),

  delete: authedProcedure("list")
    .input(
      v.object({
        id: v.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id } = input;

      // Get the file info before deletion
      const file = db.select().from(upload).where(eq(upload.id, id)).get();

      if (!file) {
        throw new Error("File not found");
      }

      // Delete the physical file
      try {
        await unlink(join(env.ROOT_DIR, file.filePath));
      } catch (error) {
        console.error("Error deleting file:", error);
        // Continue with database deletion even if file deletion fails
      }

      // Delete existing tags
      db.delete(tag).where(eq(tag.uploadId, id)).run();

      // Delete from database
      const deleted = db
        .delete(upload)
        .where(eq(upload.id, id))
        .returning()
        .get();

      return deleted;
    }),
});
