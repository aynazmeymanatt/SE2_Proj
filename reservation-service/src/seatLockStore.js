const LOCK_TTL_SECONDS = 10 * 60; // 10 minutes, per the user story: "locked for 10 minutes"

class SeatLockStore {
  constructor(redisUrl = process.env.REDIS_URL || "redis://localhost:6379") {
    // Lazily required so unit tests can construct this class with a fake
    // client (see seatLockStore.test.js) without needing ioredis installed.
    const Redis = require("ioredis");
    this.redis = new Redis(redisUrl);
  }

  _key(seatId) {
    return `seat-lock:${seatId}`;
  }

  /**
   * Atomically lock a seat for a given user, if it isn't already locked.
   * Uses SET ... NX EX so the check-and-set is a single atomic Redis op,
   * eliminating the race condition between two concurrent buyers.
   */
  async acquireLock(seatId, userId) {
    const key = this._key(seatId);
    const result = await this.redis.set(key, userId, "NX", "EX", LOCK_TTL_SECONDS);
    return result === "OK";
  }

  async getLockOwner(seatId) {
    return this.redis.get(this._key(seatId));
  }

  /**
   * Release the lock, but only if the caller is the one who holds it
   * (prevents a slow/late request from releasing someone else's lock).
   */
  async releaseLock(seatId, userId) {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, this._key(seatId), userId);
    return result === 1;
  }

  /** Remaining TTL in seconds, or -2 if the key doesn't exist (already expired/released). */
  async getRemainingTtl(seatId) {
    return this.redis.ttl(this._key(seatId));
  }

  async close() {
    await this.redis.quit();
  }
}

module.exports = { SeatLockStore, LOCK_TTL_SECONDS };
