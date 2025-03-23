import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "~/api/context";
import type { AuthScope } from "./auth";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = (scope: AuthScope["type"]) =>
  publicProcedure.use(({ ctx, next }) => {
    if (!ctx.scopes.some((s) => s.type === scope)) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next();
  });
