import { Outlet, redirect } from "react-router";
import { commitSession, getSession } from "~/sessions.server";
import type { Route } from "./+types/auth-layout";
import { Header } from "~/components/header";
import { useScrollState } from "~/hooks/useScrollState";
import { cn } from "~/lib/utils";

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
  const scrolled = useScrollState();

  return (
    <main className="py-0 sm:px-4">
      <div className="">
        <Header
          className={cn(
            "m-auto transition-[max-width]",
            scrolled ? "max-w-full" : "max-w-[1000px]",
          )}
        />
        <Outlet />
      </div>
    </main>
  );
}
