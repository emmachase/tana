import { redirect } from "react-router";
import { getSession, commitSession } from "~/sessions.server";
import type { Route } from "./+types/logout";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("cookie"));
  if (session.has("authed")) {
    session.unset("authed");
  }

  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function Logout() {
  return null;
}
