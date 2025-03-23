import { Outlet, redirect } from "react-router";
import { getSession } from "~/sessions.server";
import { Noise } from "~/components/noise";
export async function loader({ request }: { request: Request }) {
  const session = await getSession(request.headers.get("cookie"));
  if (!session.has("authed")) {
    return redirect("/login");
  }
}

export default function Layout() {
  return (
    <div className="relative">
      <Noise />
      <Outlet />
    </div>
  );
}
