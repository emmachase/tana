import jwt from "jsonwebtoken";
import { getSecret } from "~/db/dao";
import { authedProcedure } from "./trpc";
import { allScopes } from "./auth";

export const token = authedProcedure("upload").mutation(async () => {
  const scopes = allScopes();

  const uploadToken = jwt.sign({ scopes }, getSecret("JWT"), {
    // No expiration for upload tokens - they're permanent
  });

  return {
    token: uploadToken,
  };
});
