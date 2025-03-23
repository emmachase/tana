import { Outlet, redirect } from "react-router";
import { getSession } from "~/sessions.server";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("cookie"));
  if (!session.has("authed")) {
    return redirect("/login");
  }
}

export default function Layout() {
  return <Outlet />;
}
