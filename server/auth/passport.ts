/**
 * Passport.js configuration — the Strategy pattern for authentication.
 *
 * Passport uses a plugin architecture: you register "strategies" that define
 * how to verify credentials. LocalStrategy checks username + password against
 * our database. You could add GoogleStrategy, SAMLStrategy, etc. later without
 * changing the rest of the auth code.
 *
 * Serialization: after login, passport stores the user ID in the session.
 * On each subsequent request, it "deserializes" by looking up the user by ID.
 * This keeps the session cookie small (just an ID, not the full user object).
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { comparePassword } from "./password.js";
import { storage } from "../storage.js";

// Type augmentation — tells TypeScript what req.user looks like.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global { namespace Express {
  interface User {
    id: number;
    username: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: "operator" | "engineer" | "manager" | "admin";
    createdAt: Date;
  }
} }

// LocalStrategy: verify username + password against the storage layer
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Invalid credentials" });
      }

      const valid = await comparePassword(password, user.passwordHash);
      if (!valid) {
        return done(null, false, { message: "Invalid credentials" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

// Serialize: store only the user ID in the session (keeps cookie small)
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

// Deserialize: on each request, look up the full user by ID
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

export { passport };
