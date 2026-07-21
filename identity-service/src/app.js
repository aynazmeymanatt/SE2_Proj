// Identity & Access Domain — STUB
// Demonstrates the service boundary from the Component Diagram: owns
// authentication and role-based access, isolated from every other domain.
// Not a full implementation — no real password hashing, token signing,
// or persistence. Swap the in-memory data for a real user store + JWT
// library (e.g. jsonwebtoken) to make this production-ready.

const express = require("express");

const USERS = {
  "buyer-1": { id: "buyer-1", role: "buyer" },
  "organizer-1": { id: "organizer-1", role: "organizer" },
  "admin-1": { id: "admin-1", role: "admin" },
};

function createApp() {
  const app = express();
  app.use(express.json());

  // POST /auth/login { userId } -> { token, role }
  app.post("/auth/login", (req, res) => {
    const { userId } = req.body;
    const user = USERS[userId];
    if (!user) return res.status(401).json({ error: "invalid_credentials" });
    return res.json({ token: `stub-token-${user.id}`, role: user.role });
  });

  // GET /auth/verify?token=... -> { userId, role }
  app.get("/auth/verify", (req, res) => {
    const token = req.query.token || "";
    const userId = token.replace("stub-token-", "");
    const user = USERS[userId];
    if (!user) return res.status(401).json({ error: "invalid_token" });
    return res.json({ userId: user.id, role: user.role });
  });

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  return app;
}

module.exports = { createApp, USERS };
