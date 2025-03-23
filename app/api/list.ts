import { authedProcedure } from "./trpc";
import { db } from "~/db";
import { upload, tag } from "~/db/schema";
import { desc, eq, like, lt, or, and } from "drizzle-orm";
import * as v from "valibot";

const DEFAULT_LIMIT = 30;

export const list = authedProcedure("list")
  .input(
    v.object({
      cursor: v.optional(v.number()),
      limit: v.optional(v.number()),
      mfilter: v.optional(v.string()),
      gallery: v.optional(v.boolean()),
    }),
  )
  .query(async ({ input }) => {
    const limit = input.limit ?? DEFAULT_LIMIT;
    const { cursor, mfilter, gallery } = input;

    const where = gallery
      ? or(like(upload.mime, "%image%"), like(upload.mime, "%video%"))
      : mfilter
        ? like(upload.mime, `%${mfilter}%`)
        : undefined;

    const results = await db
      .select()
      .from(upload)
      .leftJoin(tag, eq(upload.id, tag.uploadId))
      .where(
        cursor && where
          ? and(lt(upload.id, cursor), where)
          : cursor
            ? lt(upload.id, cursor)
            : where,
      )
      .orderBy(desc(upload.id))
      .limit(limit);

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
