import { getSession } from "~/sessions.server";

export async function createContext({ req }: { req: Request }) {
  // As an example, you can retrieve auth or other information here.
  const session = await getSession(req.headers.get("cookie"));

  return {
    req,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
