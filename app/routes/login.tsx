import { Form, redirect, useActionData, useNavigation } from "react-router";
import { commitSession, getSession } from "~/sessions.server";
import type { ActionFunctionArgs } from "react-router";
import type { Route } from "./+types/login";
import { env } from "~/env";
import { Logo } from "~/components/logo";
import { verifyPassword } from "~/lib/crypto";
import * as v from "valibot";
import { cn } from "~/lib/utils";

type ActionData = { error?: string; success?: boolean };

export function meta({}: Route.MetaArgs) {
  return [{ title: "tana - Login" }];
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = v.parse(v.string(), formData.get("password"));

  if (!password || !(await verifyPassword(password, env.ADMIN_PASSWORD))) {
    return new Response(JSON.stringify({ error: "Invalid password" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": await commitSession(await getSession()),
      },
    });
  }

  const session = await getSession(request.headers.get("cookie"));

  const location = session.get("returnTo") || "/";
  session.set("authed", true);
  session.unset("returnTo");

  return new Response(JSON.stringify({ success: true }), {
    status: 302,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": await commitSession(session),
      Location: location,
    },
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("cookie"));
  if (session.has("authed")) {
    return redirect("/");
  }
}

export default function Login() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="bg-background flex h-screen w-screen">
      <div className="flex w-full flex-col md:flex-row">
        <div className="w-full md:w-1/2">
          <div className="relative h-64 w-full pt-6 md:h-full md:pt-0">
            <div className="from-background absolute right-0 bottom-0 left-0 h-24 bg-gradient-to-t to-transparent md:hidden"></div>
            <img
              src="/yukisame.png"
              alt="Hero image"
              className="h-full w-full object-cover object-top"
            />
          </div>
        </div>
        <div className="flex w-full items-center justify-center md:w-1/2">
          <div className="w-full max-w-md rounded-lg p-8 pt-12 shadow-sm md:pt-8">
            <div className="mb-6">
              {/* <h1 className="text-center text-3xl font-bold">tana</h1> */}
              <Logo className="h-20" />
              <h2 className="text-muted-foreground mb-6 text-center text-sm">
                emma's file host lives here
              </h2>
            </div>
            <Form method="post" className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={cn(
                    "border-input mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none",
                    actionData?.error &&
                      "border-red-500 focus:border-red-500 focus:ring-red-500",
                  )}
                  placeholder="Enter your password"
                  data-1p-ignore
                  data-op-ignore
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? "Logging in..." : "Login"}
              </button>
            </Form>
            <div className="text-muted-foreground mt-3 text-center text-sm">
              for dmca etc, contact `adm at its-em dot ma`
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
