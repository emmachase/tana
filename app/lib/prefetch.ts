import {
  unstable_createContext,
  unstable_RouterContextProvider,
} from "react-router";
import type { Route } from "../+types/root";
import { type QueryClient } from "@tanstack/react-query";
import { getQueryClient } from "~/lib/trpc";
import { appRouter, type AppRouter } from "../api/router";
import {
  createTRPCOptionsProxy,
  type TRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
import { createContext } from "~/api/context";
import type { AuthScope } from "~/api/auth";
import { getSession } from "~/sessions.server";
import { allScopes, decodeJWT } from "~/api/auth";
export const queryClientContext = unstable_createContext<QueryClient>();

export const queryClientMiddleware: Route.unstable_MiddlewareFunction = async ({
  context,
}) => {
  const queryClient = getQueryClient();
  context.set(queryClientContext, queryClient);
};

export const authContext = unstable_createContext<AuthScope[]>();

export const authMiddleware: Route.unstable_MiddlewareFunction = async ({
  context,
  request,
}) => {
  const session = await getSession(request.headers.get("cookie"));

  const token = request.headers.get("authorization")?.split(" ")[1];

  const scopes = session.has("authed")
    ? allScopes()
    : token
      ? await decodeJWT(token)
      : [];

  context.set(authContext, scopes);
};

export const trpcContext =
  unstable_createContext<TRPCOptionsProxy<AppRouter>>();

export const trpcMiddleware: Route.unstable_MiddlewareFunction = async ({
  request,
  context,
}) => {
  const queryClient = context.get(queryClientContext);
  const scopes = context.get(authContext);

  context.set(
    trpcContext,
    createTRPCOptionsProxy({
      ctx: await createContext({ req: request, scopes }),
      router: appRouter,
      queryClient,
    }),
  );
};

/**
 * Provides query client and TRPC client for prefetching
 * @param context Router context
 * @returns Query client and TRPC client
 */
export const prefetch = (context: unstable_RouterContextProvider) => {
  const queryClient = context.get(queryClientContext);
  const trpc = context.get(trpcContext);

  return {
    queryClient,
    trpc,
  };
};

/**
 * Skips prefetching if the request is from the same origin.
 *
 * This is useful for skipping prefetching on internal navigations.
 * @param request Request
 * @param fn Function to run if not skipped
 * @returns Result of fn or undefined
 */
export async function skipIfSameOrigin<T>(
  request: Request,
  fn: () => Promise<T>,
): Promise<T | undefined> {
  const refererHeader = request.headers.get("referer");
  const referer = refererHeader ? new URL(refererHeader) : null;
  const url = new URL(request.url);
  // For our purposes, protocol (i.e. origin) isn't relevant since the fetches could be internal or behind a proxy
  // Origin: http://localhost:3000
  // Host: localhost:3000
  // Hostname: localhost
  const isSameOrigin = referer?.host === url.host;
  if (isSameOrigin) {
    return;
  }

  return await fn();
}
