/**
 * Password hashing using Node's built-in crypto.scrypt.
 *
 * scrypt is a key derivation function (KDF) designed for password storage.
 * Unlike fast hashes (SHA-256), it's intentionally slow and memory-hard,
 * making brute-force attacks expensive. No external dependency needed.
 *
 * Storage format: "hex_salt:hex_hash" — the salt is stored alongside the
 * hash so we can reproduce the same derivation at login time.
 */

import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);
const SALT_LENGTH = 32; // 256 bits of randomness
const KEY_LENGTH = 64; // 512-bit derived key

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function comparePassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  // timingSafeEqual prevents timing attacks — always takes the same time
  // regardless of how many bytes match (unlike === which short-circuits).
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), key);
}
