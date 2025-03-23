import { type AuthScope } from "./auth";

export async function createContext({
  req,
  scopes,
}: {
  req: Request;
  scopes: AuthScope[];
}) {
  return {
    req,
    scopes,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
