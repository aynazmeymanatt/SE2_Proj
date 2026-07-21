const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("./app");

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test("login succeeds for a known user and returns a role", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "buyer-1" }),
  });
  const body = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.role, "buyer");
  assert.ok(body.token.includes("buyer-1"));

  server.close();
});

test("login fails for an unknown user", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "does-not-exist" }),
  });

  assert.strictEqual(res.status, 401);
  server.close();
});

test("verify round-trips a token issued by login", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const loginRes = await fetch(`http://localhost:${port}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "admin-1" }),
  });
  const { token } = await loginRes.json();

  const verifyRes = await fetch(`http://localhost:${port}/auth/verify?token=${token}`);
  const verifyBody = await verifyRes.json();

  assert.strictEqual(verifyRes.status, 200);
  assert.strictEqual(verifyBody.userId, "admin-1");
  assert.strictEqual(verifyBody.role, "admin");

  server.close();
});
