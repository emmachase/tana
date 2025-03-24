import { Outlet, redirect } from "react-router";
import { commitSession, getSession } from "~/sessions.server";
import type { Route } from "./+types/auth-layout";

export const unstable_middleware: Route.unstable_MiddlewareFunction[] = [
  async ({ request }) => {
    const session = await getSession(request.headers.get("cookie"));
    if (!session.has("authed") || session.get("authed") !== true) {
      session.set("returnTo", request.url);
      throw redirect("/login", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }
  },
];

export default function Layout() {
  return <Outlet />;
}
