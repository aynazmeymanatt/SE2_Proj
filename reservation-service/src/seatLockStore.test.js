const test = require("node:test");
const assert = require("node:assert");
const { SeatLockStore } = require("./seatLockStore");

// In-memory fake so this test runs without a real Redis instance.
// Mirrors the atomic SET NX behavior of the real store.
class FakeRedis {
  constructor() { this.store = new Map(); }
  async set(key, value, ...flags) {
    if (flags.includes("NX") && this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }
  async get(key) { return this.store.has(key) ? this.store.get(key) : null; }
  async eval(_script, _numKeys, key, ownerArg) {
    if (this.store.get(key) === ownerArg) { this.store.delete(key); return 1; }
    return 0;
  }
  async ttl(key) { return this.store.has(key) ? 600 : -2; }
  async quit() {}
}

function fakeStore() {
  const s = Object.create(SeatLockStore.prototype);
  s.redis = new FakeRedis();
  s._key = (seatId) => `seat-lock:${seatId}`;
  return s;
}

test("only one of many concurrent lock attempts on the same seat succeeds", async () => {
  const lockStore = fakeStore();
  const seatId = "A1-12";

  const attempts = Array.from({ length: 50 }, (_, i) =>
    lockStore.acquireLock(seatId, `user-${i}`)
  );
  const results = await Promise.all(attempts);

  const successCount = results.filter(Boolean).length;
  assert.strictEqual(successCount, 1, "exactly one buyer should win the seat lock");
});

test("releasing a lock frees the seat for the next buyer", async () => {
  const lockStore = fakeStore();
  const seatId = "A1-13";

  await lockStore.acquireLock(seatId, "user-1");
  const secondAttemptBeforeRelease = await lockStore.acquireLock(seatId, "user-2");
  assert.strictEqual(secondAttemptBeforeRelease, false);

  await lockStore.releaseLock(seatId, "user-1");
  const secondAttemptAfterRelease = await lockStore.acquireLock(seatId, "user-2");
  assert.strictEqual(secondAttemptAfterRelease, true);
});

test("a user cannot release a lock they do not own", async () => {
  const lockStore = fakeStore();
  const seatId = "A1-14";

  await lockStore.acquireLock(seatId, "user-1");
  const released = await lockStore.releaseLock(seatId, "user-2");
  assert.strictEqual(released, false);
});
