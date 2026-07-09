const express = require("express");
const { SeatLockStore, LOCK_TTL_SECONDS } = require("./seatLockStore");

function createApp(lockStore = new SeatLockStore()) {
  const app = express();
  app.use(express.json());

  // POST /seats/:seatId/lock  { userId }
  // Attempt to acquire the seat lock. Returns 409 if already held by someone else.
  app.post("/seats/:seatId/lock", async (req, res) => {
    const { seatId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const acquired = await lockStore.acquireLock(seatId, userId);
    if (!acquired) {
      const owner = await lockStore.getLockOwner(seatId);
      return res.status(409).json({
        error: "seat_unavailable",
        message: "Seat is already locked or booked",
        lockedBy: owner === userId ? undefined : "another_user",
      });
    }

    return res.status(201).json({
      seatId,
      userId,
      status: "locked",
      ttlSeconds: LOCK_TTL_SECONDS,
    });
  });

  // DELETE /seats/:seatId/lock  { userId }
  // Release a lock. Only the current owner can release it.
  app.delete("/seats/:seatId/lock", async (req, res) => {
    const { seatId } = req.params;
    const { userId } = req.body;

    const released = await lockStore.releaseLock(seatId, userId);
    if (!released) {
      return res.status(403).json({ error: "not_lock_owner_or_already_released" });
    }
    return res.status(200).json({ seatId, status: "released" });
  });

  // GET /seats/:seatId/status
  app.get("/seats/:seatId/status", async (req, res) => {
    const { seatId } = req.params;
    const owner = await lockStore.getLockOwner(seatId);
    const ttl = await lockStore.getRemainingTtl(seatId);

    return res.status(200).json({
      seatId,
      status: owner ? "locked" : "available",
      ttlSeconds: ttl > 0 ? ttl : null,
    });
  });

  app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

  return app;
}

module.exports = { createApp };
