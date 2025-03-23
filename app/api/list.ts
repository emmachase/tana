import { authedProcedure } from "./trpc";
import { db } from "~/db";
import { upload, tag } from "~/db/schema";
import { desc, eq, like, or, and, lte } from "drizzle-orm";
import * as v from "valibot";

const DEFAULT_LIMIT = 30;

export const list = authedProcedure("list")
  .input(
    v.intersect([
      v.union([
        v.object({
          mfilter: v.optional(v.string()),
        }),
        v.object({
          gallery: v.optional(v.boolean()),
        }),
      ]),
      v.object({
        cursor: v.optional(v.number()),
        limit: v.optional(v.number()),
      }),
    ]),
  )
  .query(async ({ input }) => {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const { cursor } = input;

    const whereCursor = cursor ? lte(upload.id, cursor) : undefined;

    const where =
      "gallery" in input
        ? or(like(upload.mime, "%image%"), like(upload.mime, "%video%"))
        : "mfilter" in input
          ? like(upload.mime, `%${input.mfilter}%`)
          : undefined;

    const results = await db
      .select()
      .from(upload)
      .leftJoin(tag, eq(upload.id, tag.uploadId))
      .where(and(whereCursor, where))
      .orderBy(desc(upload.id))
      .limit(limit + 1); // +1 to check if there are more results

    // Group tags by upload
    const uploadsWithTags = results.reduce<
      Record<number, typeof upload.$inferSelect & { tags: string[] }>
    >((acc, row) => {
      const upload = row.upload;
      if (!acc[upload.id]) {
        acc[upload.id] = {
          ...upload,
          tags: [],
        };
      }

      if (row.tag) {
        acc[upload.id].tags.push(row.tag.value);
      }

      return acc;
    }, {});

    return Object.values(uploadsWithTags).sort((a, b) => b.id - a.id);
  });

export type ListResponse = Awaited<ReturnType<typeof list>>;

export type ObjectModel = ListResponse[number];
