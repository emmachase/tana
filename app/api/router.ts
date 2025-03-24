import { list } from "~/api/list";
import { router } from "~/api/trpc";
import { upload } from "./upload";

export const appRouter = router({
  list,
  upload,
});

export type AppRouter = typeof appRouter;
