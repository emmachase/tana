import argon2 from "argon2";
import readline from "readline";

/**
 * Script to generate Argon2id password hashes
 * Usage: node scripts/hash-password.js [password]
 * If no password is provided, you'll be prompted to enter one
 */

async function hashPassword(password) {
  try {
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
    });
    return hash;
  } catch (error) {
    console.error("Error hashing password:", error.message);
    process.exit(1);
  }
}

async function promptPassword() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter password to hash: ", (password) => {
      rl.close();
      resolve(password);
    });
  });
}

async function main() {
  let password = process.argv[2];

  if (!password) {
    password = await promptPassword();
  }

  if (!password || password.trim() === "") {
    console.error("Error: Password cannot be empty");
    process.exit(1);
  }

  console.log("\nGenerating Argon2id hash...\n");
  const hash = await hashPassword(password);
  console.log("Hash:", hash);
  console.log("\nThis hash can be stored in your database.");
}

main();
