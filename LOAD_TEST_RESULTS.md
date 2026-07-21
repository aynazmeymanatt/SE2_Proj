# Load & Stress Test Results — Reservation Engine

Per the QA Strategy in the Agile Delivery Plan (Section 7), the reservation
engine's core correctness guarantee (no double-booking under concurrent
load) was verified with `scripts/load-test-reservation.js` against a real
running instance (Node + Redis, not mocked).

## How to reproduce

```bash
docker compose up -d redis reservation-service
node scripts/load-test-reservation.js 500   # or any concurrency level
```

## Actual results

| Concurrent requests | Successful locks | Correctly rejected (409) | Errors | Result |
|---|---|---|---|---|
| 500  | 1 | 499  | 0 | ✅ PASS |
| 2000 | 1 | 1999 | 0 | ✅ PASS |

In both runs, exactly one buyer acquired the seat lock no matter how many
concurrent bot requests targeted the same seat — the atomic `SET NX EX`
Redis operation prevents the race condition entirely, rather than
detecting and recovering from it after the fact.

Latency did increase under the 2000-concurrent-request run (p95 ~2.6s vs
~1s at 500), since all requests share one Redis connection in this
single-instance test setup. In a real deployment behind the Kubernetes
horizontal autoscaler (see the Deployment Diagram), this load would be
spread across multiple reservation-service replicas.
