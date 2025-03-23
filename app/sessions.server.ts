import { createCookieSessionStorage } from "react-router";
import { getSecret } from "./db/dao";

type SessionData = {
  userId: string;
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
      secrets: [getSecret()],
      secure: true,
    },
  });

export { getSession, commitSession, destroySession };
