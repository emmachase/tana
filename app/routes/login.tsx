import { Form, redirect, useActionData, useNavigation } from "react-router";
import { commitSession, getSession } from "~/sessions.server";
import type { ActionFunctionArgs } from "react-router";
import type { Route } from "./+types/login";

type ActionData = { error?: string; success?: boolean };

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = formData.get("password");

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "Invalid password" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": await commitSession(await getSession()),
      },
    });
  }

  const session = await getSession();
  session.set("authed", true);
  return new Response(JSON.stringify({ success: true }), {
    status: 302,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": await commitSession(session),
      Location: "/",
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
    <div className="bg-background flex h-screen w-screen items-center justify-center">
      <div className="w-96 rounded-lg border p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">Login</h1>
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
              className="border-input mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter your password"
            />
          </div>
          {actionData?.error && (
            <div className="text-sm text-red-600">{actionData.error}</div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </Form>
      </div>
    </div>
  );
}
