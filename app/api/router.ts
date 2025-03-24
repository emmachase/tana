import { hero } from "~/api/hero";
import { list } from "~/api/list";
import { router } from "~/api/trpc";
import { uploadMutation } from "./upload";

export const appRouter = router({
  hero,
  list,
  upload: uploadMutation,
});

export type AppRouter = typeof appRouter;
