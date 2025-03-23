import { db } from "~/db";
import { secret } from "./schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

type SecretType = "session" | "JWT";

const cachedSecrets = new Map<SecretType, string>();
export function getSecret(type: SecretType) {
  if (cachedSecrets.has(type)) {
    return cachedSecrets.get(type)!;
  }

  const result = db.select().from(secret).where(eq(secret.key, type)).get();
  if (!result) {
    // Generate a new secret
    const newSecret = crypto.randomBytes(32).toString("hex");
    db.insert(secret).values({ key: type, value: newSecret }).execute();
    cachedSecrets.set(type, newSecret);
    return newSecret;
  }

  cachedSecrets.set(type, result.value);
  return result.value;
}
