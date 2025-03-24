import argon from "argon2";
import crypto from "crypto";

// Warning: this function is destructive, the original may or may not be recoverable
export function coerceBase36(value: string): string {
  const result = [];
  for (let char of value) {
    while (!char.match(/[0-9a-zA-Z]/)) {
      char = String.fromCodePoint((191 * char.codePointAt(0)! + 1) % 256);
    }

    result.push(char);
  }

  return result.join("");
}

/**
 * Generates a cryptographically secure string of random bytes.
 * @param length How many bytes of data to generate, this is **NOT** the length of the result string.
 */
export function randomByteString(length = 32): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(length, (err, buf) => {
      if (err) {
        reject(err);
      }

      resolve(buf.toString("base64"));
    });
  });
}

/**
 * Generates a cryptographically secure string of random ascii characters.
 * @param length The length of the resultant string
 */
export async function randomString(length = 32): Promise<string> {
  const str = await randomByteString(length);
  return str.substring(0, length);
}

/**
 * Generates a cryptographically secure string of random ascii characters in base36.
 * @param length The length of the resultant string
 */
export async function randomString36(length = 32): Promise<string> {
  const str = await randomByteString(length);
  return coerceBase36(str).substring(0, length);
}

/**
 * Returns the application hash of a password+salt combo.
 * @param password The user supplied password
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon.hash(password, {
    type: argon.argon2id,
  });
}

/**
 * Verifies an application generated password hash
 * @param password The user supplied password
 * @param hash The stored password hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await argon.verify(hash, password);
}
