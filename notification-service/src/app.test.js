const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("./app");

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test("delivers a success notification with the ticket id in the message", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/internal/order-status-changed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user-1", status: "success", ticketId: "ticket-123" }),
  });
  const body = await res.json();

  assert.strictEqual(res.status, 202);
  assert.ok(body.message.includes("ticket-123"));
  server.close();
});

test("delivers a failure notification when status is payment_failed", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/internal/order-status-changed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "user-1", status: "payment_failed" }),
  });
  const body = await res.json();

  assert.strictEqual(res.status, 202);
  assert.ok(body.message.toLowerCase().includes("could not be completed"));
  server.close();
});

test("rejects a request missing required fields", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/internal/order-status-changed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "success" }), // missing userId
  });

  assert.strictEqual(res.status, 400);
  server.close();
});
