import { list } from "~/api/list";
import { router } from "~/api/trpc";
import { upload } from "./upload";
import { fileOps } from "./fileOps";

export const appRouter = router({
  list,
  upload,
  fileOps,
});

export type AppRouter = typeof appRouter;
