import { authedProcedure, router } from "./trpc";
import { db } from "~/db";
import { upload, tag } from "~/db/schema";
import { desc, eq, like, or, and, lte, sql, count } from "drizzle-orm";
import * as v from "valibot";

const DEFAULT_LIMIT = 30;

// Common input schema parts
const filterSchema = v.intersect([
  v.union([
    v.object({
      mfilter: v.string(),
    }),
    v.object({
      gallery: v.literal(true),
    }),
    v.object({}),
  ]),
  v.object({
    name: v.optional(v.string()),
  }),
]);

// Helper function to build filter conditions
const buildFilterConditions = (input: v.InferOutput<typeof filterSchema>) => {
  const { name } = input;
  let baseWhere = name ? like(upload.name, `%${name}%`) : undefined;

  if ("gallery" in input && input.gallery) {
    const galleryFilter = or(
      like(upload.mime, "image/%"),
      like(upload.mime, "video/%"),
    );
    baseWhere = baseWhere ? and(baseWhere, galleryFilter) : galleryFilter;
  } else if ("mfilter" in input && input.mfilter) {
    const mimeFilter = like(upload.mime, `%${input.mfilter}%`);
    baseWhere = baseWhere ? and(baseWhere, mimeFilter) : mimeFilter;
  }

  return baseWhere;
};

export const list = router({
  init: authedProcedure("list")
    .input(filterSchema)
    .output(
      v.object({
        itemCount: v.number(),
        initialCursor: v.optional(v.number()),
      }),
    )
    .query(async ({ input }) => {
      const baseWhere = buildFilterConditions(input);

      const first = db
        .select()
        .from(upload)
        .where(baseWhere)
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
          .where(and(lte(upload.id, first.id), baseWhere))
          .get()?.count ?? 0;

      return {
        itemCount,
        initialCursor: first.id,
      };
    }),

  getPage: authedProcedure("list")
    .input(
      v.intersect([
        filterSchema,
        v.object({
          cursor: v.optional(v.number()),
          limit: v.optional(v.number()),
        }),
      ]),
    )
    .query(async ({ input }) => {
      const limit = input.limit ?? DEFAULT_LIMIT;
      const { cursor } = input;
      const baseWhere = buildFilterConditions(input);
      const whereCursor = cursor ? lte(upload.id, cursor) : undefined;

      const query = db
        .select({
          upload,
          tags: sql<string>`group_concat(${tag.value})`.as("tags"),
        })
        .from(upload)
        .where(and(whereCursor, baseWhere))
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
