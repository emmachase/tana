import { createCookieSessionStorage } from "react-router";
import { getSecret } from "./db/dao";

type SessionData = {
  authed: boolean;
};

type SessionFlashData = {
  error: string;
};

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",

      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
      secrets: [getSecret("session")],
      secure: true,
    },
  });

export { getSession, commitSession, destroySession };
