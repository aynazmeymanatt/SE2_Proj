const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("./app");

function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

test("GET /events returns all events with no filter", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/events`);
  const body = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.results.length, 2);
  server.close();
});

test("GET /events?genre=music filters correctly", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/events?genre=music`);
  const body = await res.json();

  assert.strictEqual(body.results.length, 1);
  assert.strictEqual(body.results[0].id, "evt-1");
  server.close();
});

test("GET /events/:id returns 404 for an unknown event", async () => {
  const server = await startServer(createApp());
  const port = server.address().port;

  const res = await fetch(`http://localhost:${port}/events/does-not-exist`);
  assert.strictEqual(res.status, 404);
  server.close();
});
