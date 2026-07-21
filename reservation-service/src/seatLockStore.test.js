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

  const releaseResult = await lockStore.releaseLock(seatId, "user-1");
  assert.strictEqual(releaseResult, true, "releasing your own lock should report success");

  const secondAttemptAfterRelease = await lockStore.acquireLock(seatId, "user-2");
  assert.strictEqual(secondAttemptAfterRelease, true);
});

test("getLockOwner reports the current holder of a seat, or null if free", async () => {
  const lockStore = fakeStore();
  const seatId = "A1-15";

  assert.strictEqual(await lockStore.getLockOwner(seatId), null);
  await lockStore.acquireLock(seatId, "user-1");
  assert.strictEqual(await lockStore.getLockOwner(seatId), "user-1");
});

test("getRemainingTtl reflects lock presence", async () => {
  const lockStore = fakeStore();
  const seatId = "A1-16";

  assert.strictEqual(await lockStore.getRemainingTtl(seatId), -2);
  await lockStore.acquireLock(seatId, "user-1");
  assert.strictEqual(await lockStore.getRemainingTtl(seatId), 600);
});

test("close() delegates to the underlying redis client's quit()", async () => {
  const lockStore = fakeStore();
  let quitCalled = false;
  lockStore.redis.quit = async () => { quitCalled = true; };

  await lockStore.close();
  assert.strictEqual(quitCalled, true);
});

test("a user cannot release a lock they do not own", async () => {
  const lockStore = fakeStore();
  const seatId = "A1-14";

  await lockStore.acquireLock(seatId, "user-1");
  const released = await lockStore.releaseLock(seatId, "user-2");
  assert.strictEqual(released, false);
});
