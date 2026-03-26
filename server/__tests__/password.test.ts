/**
 * Unit tests for password hashing (server/auth/password.ts).
 *
 * Tests the scrypt-based KDF used for secure password storage.
 * Covers: hash format, verification, uniqueness (salting), and
 * defensive handling of malformed/corrupted stored hashes.
 */

import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../auth/password";

describe("hashPassword", () => {
  it("returns a string in salt:hash format", async () => {
    const result = await hashPassword("mypassword");
    const parts = result.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0); // salt
    expect(parts[1].length).toBeGreaterThan(0); // hash
  });

  it("produces hex-encoded salt and hash", async () => {
    const result = await hashPassword("mypassword");
    const [salt, hash] = result.split(":");
    // Hex strings only contain [0-9a-f]
    expect(salt).toMatch(/^[0-9a-f]+$/);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique hashes for the same password (different salts)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2); // Different salts → different outputs
  });

  it("generates a 32-byte (64 hex char) salt", async () => {
    const result = await hashPassword("test");
    const [salt] = result.split(":");
    // SALT_LENGTH = 32 bytes → 64 hex chars
    expect(salt).toHaveLength(64);
  });

  it("generates a 64-byte (128 hex char) derived key", async () => {
    const result = await hashPassword("test");
    const [, hash] = result.split(":");
    // KEY_LENGTH = 64 bytes → 128 hex chars
    expect(hash).toHaveLength(128);
  });
});

describe("comparePassword", () => {
  it("returns true for correct password", async () => {
    const stored = await hashPassword("correctpassword");
    const result = await comparePassword("correctpassword", stored);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const stored = await hashPassword("correctpassword");
    const result = await comparePassword("wrongpassword", stored);
    expect(result).toBe(false);
  });

  it("returns false for empty password against a valid hash", async () => {
    const stored = await hashPassword("realpassword");
    const result = await comparePassword("", stored);
    expect(result).toBe(false);
  });

  // --- Defensive handling of malformed stored hashes ---

  it("returns false for empty stored string", async () => {
    const result = await comparePassword("anything", "");
    expect(result).toBe(false);
  });

  it("returns false for stored string with no colon separator", async () => {
    const result = await comparePassword("anything", "nocolonhere");
    expect(result).toBe(false);
  });

  it("returns false for stored string with empty salt", async () => {
    const result = await comparePassword("anything", ":somehash");
    expect(result).toBe(false);
  });

  it("returns false for stored string with empty hash", async () => {
    const result = await comparePassword("anything", "somesalt:");
    expect(result).toBe(false);
  });

  it("returns false for stored hash with wrong length (corrupted)", async () => {
    // Valid salt (64 hex chars) but truncated hash
    const fakeSalt = "a".repeat(64);
    const result = await comparePassword("anything", `${fakeSalt}:deadbeef`);
    expect(result).toBe(false);
  });

  it("does not throw on completely garbage input", async () => {
    // Should return false, not throw
    const result = await comparePassword("test", "🚀:not-hex-at-all!!!");
    expect(result).toBe(false);
  });
});
