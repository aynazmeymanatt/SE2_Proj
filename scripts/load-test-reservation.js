#!/usr/bin/env node
/**
 * Load & Stress Test — Reservation Engine
 *
 * Per the QA Strategy (Agile Delivery Plan, Section 7): simulates a burst
 * of concurrent bot requests hitting the SAME seat, the exact scenario a
 * real on-sale traffic spike produces. Asserts the core correctness
 * property required by the project brief: exactly one buyer wins the
 * seat, no matter how many hit it at once.
 *
 * Usage:
 *   node scripts/load-test-reservation.js [concurrency] [baseUrl]
 *
 * Example:
 *   node scripts/load-test-reservation.js 500 http://localhost:3001
 */

const CONCURRENCY = parseInt(process.argv[2], 10) || 200;
const BASE_URL = process.argv[3] || "http://localhost:3001";
const SEAT_ID = `load-test-seat-${Date.now()}`;

async function attemptLock(userId) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/seats/${SEAT_ID}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return { status: res.status, ms: Date.now() - start };
  } catch (err) {
    return { status: 0, ms: Date.now() - start, error: err.message };
  }
}

async function main() {
  console.log(`Load test: ${CONCURRENCY} concurrent lock attempts on seat "${SEAT_ID}"`);
  console.log(`Target: ${BASE_URL}\n`);

  const attempts = Array.from({ length: CONCURRENCY }, (_, i) => attemptLock(`bot-user-${i}`));

  const overallStart = Date.now();
  const results = await Promise.all(attempts);
  const totalMs = Date.now() - overallStart;

  const succeeded = results.filter((r) => r.status === 201);
  const rejected = results.filter((r) => r.status === 409);
  const errored = results.filter((r) => r.status === 0);
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];

  console.log("--- Results ---");
  console.log(`Total wall-clock time: ${totalMs}ms`);
  console.log(`Successful locks (201): ${succeeded.length}`);
  console.log(`Correctly rejected (409): ${rejected.length}`);
  console.log(`Network/connection errors: ${errored.length}`);
  console.log(`Latency p50: ${p50}ms, p95: ${p95}ms`);

  console.log("\n--- Correctness check ---");
  if (succeeded.length === 1 && rejected.length === CONCURRENCY - 1 - errored.length) {
    console.log(`PASS: exactly one buyer won the seat out of ${CONCURRENCY} concurrent attempts.`);
    process.exit(0);
  } else {
    console.error(
      `FAIL: expected exactly 1 success and ${CONCURRENCY - 1} rejections, ` +
        `got ${succeeded.length} successes and ${rejected.length} rejections. Double-booking risk!`
    );
    process.exit(1);
  }
}

main();
