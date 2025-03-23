import { hero } from "~/api/hero";
import { list } from "~/api/list";
import { router } from "~/api/trpc";

export const appRouter = router({
  hero,
  list,
});

export type AppRouter = typeof appRouter;
