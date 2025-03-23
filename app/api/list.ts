import { authedProcedure, router } from "./trpc";
import { db } from "~/db";
import { upload, tag } from "~/db/schema";
import { desc, eq, like, or, and, lte, sql, count } from "drizzle-orm";
import * as v from "valibot";

const DEFAULT_LIMIT = 30;

export const list = router({
  init: authedProcedure("list")
    .input(
      v.union([
        v.object({
          mfilter: v.optional(v.string()),
        }),
        v.object({
          gallery: v.optional(v.boolean()),
        }),
      ]),
    )
    .output(
      v.object({
        itemCount: v.number(),
        initialCursor: v.optional(v.number()),
      }),
    )
    .query(async ({ input }) => {
      const where =
        "gallery" in input
          ? or(like(upload.mime, "%image%"), like(upload.mime, "%video%"))
          : "mfilter" in input
            ? like(upload.mime, `%${input.mfilter}%`)
            : undefined;

      const first = db
        .select()
        .from(upload)
        .where(where)
        .orderBy(desc(upload.id))
        .limit(1)
        .get();

      if (!first) {
        return {
          itemCount: 0,
          initialCursor: undefined,
        };
      }

      const itemCount =
        db
          .select({ count: count() })
          .from(upload)
          .where(and(lte(upload.id, first.id), where))
          .get()?.count ?? 0;

      return {
        itemCount,
        initialCursor: first.id,
      };
    }),

  getPage: authedProcedure("list")
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

      const query = db
        .select({
          upload,
          tags: sql<string>`group_concat(${tag.value})`.as("tags"),
        })
        .from(upload)
        .where(and(whereCursor, where))
        .orderBy(desc(upload.id))
        .leftJoin(tag, eq(upload.id, tag.uploadId))
        .groupBy(upload.id)
        .limit(limit + 1);

      const results = query.all().map((row) => ({
        ...row.upload,
        tags: row.tags?.split(","),
      }));

      let nextCursor: number | undefined;
      const hasMore = results.length > limit;
      if (hasMore) {
        nextCursor = results.pop()?.id;
      }

      return {
        items: results,
        nextCursor,
      };
    }),
});

export type ListResponse = Awaited<ReturnType<typeof list.getPage>>;

export type ObjectModel = ListResponse["items"][number];
