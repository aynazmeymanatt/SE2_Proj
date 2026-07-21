# Mutation Testing — Reservation Engine

Per the QA Strategy (Agile Delivery Plan, Section 7): "Advanced Bug Hunting
and Fault Analysis... run advanced testing techniques like Mutation Testing
against core reservation code." This uses [StrykerJS](https://stryker-mutator.io/)
against `src/seatLockStore.js` — the atomic seat-lock logic that is the
platform's core correctness guarantee.

## Run it

```bash
cd reservation-service
npm install
npx stryker run
```

HTML report is written to `reports/mutation/mutation.html`.

## Actual result (last run)

```
Mutation score: 58.33% (14 killed / 10 survived / 24 total)
```

## Honest interpretation

The 10 surviving mutants are concentrated in two places:

1. **The Lua script string** (`releaseLock`'s compare-and-delete script) —
   the unit tests use an in-memory `FakeRedis` whose `eval()` mock checks
   ownership in plain JS rather than truly parsing and running the Lua
   string, so mutating the script's *text* doesn't change the fake's
   behavior. Killing these mutants would require an integration test
   against a **real** Redis instance (see `LOAD_TEST_RESULTS.md`, which
   does exercise the real Lua script end-to-end, just not under Stryker).

2. **The NX/EX flag mutants on `acquireLock`** — same root cause: the fake
   doesn't model Redis flag semantics as strictly as the real server does.

This is a known, common limitation of unit-testing against a hand-rolled
fake: it proves the *calling code's logic* is correct, but a mutation in
the exact bytes sent to Redis can only be caught by an integration test
against the real thing. The concurrency test in `seatLockStore.test.js`
and the live load test in `LOAD_TEST_RESULTS.md` together cover that gap
from two different angles — one proves the JS logic, the other proves the
real Redis interaction — but neither runs under Stryker's mutation harness
in this iteration.

**Next step if extending this**: add a `--redis-integration` test file
that runs `seatLockStore.test.js` against a real local Redis (as
`LOAD_TEST_RESULTS.md` already does manually) and include it in the
Stryker test command, which should kill most of the remaining survivors.
