import { db } from "~/db";
import { secret } from "./schema";
import { eq } from "drizzle-orm";

let cachedSecret: string | undefined = undefined;
export function getSecret() {
  if (cachedSecret) {
    return cachedSecret;
  }

  const result = db.select().from(secret).where(eq(secret.key, "secret")).get();
  if (!result) {
    throw new Error("Secret not found");
  }

  cachedSecret = result.value;
  return cachedSecret;
}
