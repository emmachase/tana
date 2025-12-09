import { list } from "~/api/list";
import { router } from "~/api/trpc";
import { upload } from "./upload";
import { fileOps } from "./fileOps";
import { detail } from "./detail";
import { token } from "./token";

export const appRouter = router({
  list,
  upload,
  fileOps,
  detail,
  token,
});

export type AppRouter = typeof appRouter;
