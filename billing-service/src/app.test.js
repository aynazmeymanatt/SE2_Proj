const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("./app");

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test("checkout issues a ticket when the payment gateway succeeds", async () => {
  const server = await startServer(createApp(() => true)); // force success
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatId: "A1-1", userId: "user-1", amount: 50 }),
  });
  const body = await res.json();

  assert.strictEqual(res.status, 201);
  assert.strictEqual(body.status, "success");
  assert.ok(body.ticketId.startsWith("ticket-A1-1"));

  server.close();
});

test("checkout returns payment_failed when the gateway declines", async () => {
  const server = await startServer(createApp(() => false)); // force failure
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatId: "A1-2", userId: "user-1", amount: 50 }),
  });
  const body = await res.json();

  assert.strictEqual(res.status, 402);
  assert.strictEqual(body.status, "payment_failed");

  server.close();
});

test("checkout rejects a request missing required fields", async () => {
  const server = await startServer(createApp(() => true));
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seatId: "A1-3" }), // missing userId, amount
  });

  assert.strictEqual(res.status, 400);
  server.close();
});
