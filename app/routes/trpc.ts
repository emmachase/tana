import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/api/router";
import type { Route } from "./+types/trpc";
import { createContext } from "~/api/context";
import { authContext } from "~/lib/prefetch";

function handleRequest(args: Route.ActionArgs | Route.LoaderArgs) {
  const scopes = args.context.get(authContext);
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: args.request,
    router: appRouter,
    createContext: (opts) => createContext({ req: opts.req, scopes }),
  });
}

export function loader(args: Route.LoaderArgs) {
  return handleRequest(args);
}

export function action(args: Route.ActionArgs) {
  return handleRequest(args);
}
