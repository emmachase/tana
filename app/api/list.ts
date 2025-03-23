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
      .from(
        db
          .select()
          .from(upload)
          .where(and(whereCursor, where))
          .orderBy(desc(upload.id))
          .limit(limit + 1)
          .as("upload"),
      )
      .leftJoin(tag, eq(upload.id, tag.uploadId));

    // Group tags by upload
    const uploadsWithTags = Object.values(
      results.reduce<
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
      }, {}),
    ).sort((a, b) => b.id - a.id);

    let nextCursor: number | undefined;
    const hasMore = uploadsWithTags.length > limit;
    if (hasMore) {
      nextCursor = uploadsWithTags.pop()?.id;
    }

    return {
      items: uploadsWithTags,
      nextCursor,
    };
  });

export type ListResponse = Awaited<ReturnType<typeof list>>;

export type ObjectModel = ListResponse["items"][number];
