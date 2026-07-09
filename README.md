# Event Ticketing Platform — Reference Implementation

This repository contains a **working reference implementation of the Reservation
Engine** (the seat-locking core described in the project's Class, Sequence, and
Component diagrams), plus the local dev environment to run it against Redis.

## Scope note

This is a proof-of-concept slice, not the full platform. It demonstrates the
concurrency-safety mechanism that the rest of the architecture (Identity,
Catalog, Billing, Notification domains — see the UML diagrams and Component
Diagram in the docs) is designed around: an atomic Redis `SET NX EX` lock so
two concurrent buyers can never hold the same seat.

## Run it

```bash
docker compose up --build
```

Then:

```bash
# Lock a seat
curl -X POST http://localhost:3001/seats/A1-12/lock \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'

# Try locking the same seat as a different user -> 409 seat_unavailable
curl -X POST http://localhost:3001/seats/A1-12/lock \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-2"}'

# Check status
curl http://localhost:3001/seats/A1-12/status

# Release
curl -X DELETE http://localhost:3001/seats/A1-12/lock \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'
```

## Tests

```bash
cd reservation-service
npm install
npm test
```

The test suite includes a concurrency test that fires 50 simultaneous lock
attempts at the same seat and asserts exactly one succeeds — the core
correctness property required by the project brief (no double-booking).

## Structure

```
reservation-service/
  src/
    seatLockStore.js       # Redis-backed atomic lock (SET NX EX + Lua-guarded release)
    seatLockStore.test.js  # Concurrency + correctness tests
    app.js                 # Express routes
    index.js               # Entry point
  Dockerfile
docker-compose.yml           # Redis + reservation-service for local dev
```
