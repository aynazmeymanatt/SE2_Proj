# Event Ticketing Platform — Reference Implementation

This repository is a **partial reference implementation** demonstrating the
service boundaries defined in the project's Component and Deployment
Diagrams: Identity, Catalog, Reservation, Billing, and Notification, each
as an independently runnable service.

## Honest scope note

**Only the Reservation Engine is a real, fully-tested implementation** of
its core responsibility — the Redis-based atomic seat lock that prevents
double-booking, backed by a concurrency test that fires 50 simultaneous
lock attempts at one seat and asserts exactly one wins.

**Identity, Catalog, Billing, and Notification are intentionally simple
stubs.** They exist to demonstrate the service boundaries and the shape of
the API each domain exposes (see the comments at the top of each
`src/index.js`), not full business logic:
- No real database — data is in-memory and resets on restart.
- No real message broker — the async event flows (SeatAvailabilityChanged,
  OrderStatusChanged) are represented as plain HTTP endpoints instead of
  Kafka/RabbitMQ consumers.
- No real payment gateway, JWT signing, or password hashing.

This mirrors how the architecture is *designed* to decouple (see the UML
diagrams and the Bounded Context analysis in the bonus document) without
claiming a production-grade implementation of every domain.

## Run it

```bash
docker compose up --build
```

Services and ports:

| Service | Port | Domain |
|---|---|---|
| reservation-service | 3001 | Reservation Engine (real) |
| identity-service | 3002 | Identity & Access (stub) |
| catalog-service | 3003 | Event Catalog & Discovery (stub) |
| billing-service | 3004 | Billing & Checkout (stub) |
| notification-service | 3005 | Notification & Messaging (stub) |

## Try the real part: seat locking

```bash
# Lock a seat
curl -X POST http://localhost:3001/seats/A1-12/lock \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'

# Try locking the same seat as a different user -> 409 seat_unavailable
curl -X POST http://localhost:3001/seats/A1-12/lock \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-2"}'

curl http://localhost:3001/seats/A1-12/status

curl -X DELETE http://localhost:3001/seats/A1-12/lock \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-1"}'
```

```bash
cd reservation-service
npm install
npm test
```

## Try the stubs

```bash
curl -X POST http://localhost:3002/auth/login -H "Content-Type: application/json" -d '{"userId":"buyer-1"}'
curl http://localhost:3003/events
curl -X POST http://localhost:3004/checkout -H "Content-Type: application/json" -d '{"seatId":"A1-12","userId":"user-1","amount":50}'
curl -X POST http://localhost:3005/internal/order-status-changed -H "Content-Type: application/json" -d '{"userId":"user-1","status":"success","ticketId":"t-1"}'
```

## Structure

```
reservation-service/     # REAL: Redis seat lock + concurrency tests
identity-service/        # STUB: auth shape only
catalog-service/         # STUB: search shape only
billing-service/         # STUB: checkout saga shape only
notification-service/    # STUB: notification dispatch shape only
docker-compose.yml        # wires all five services + Redis together
```

## Demo the full flow (all 5 services together)

Once `docker compose up --build` is running, this script walks through the
exact sequence from the End-to-End Booking Flow sequence diagram — login,
search, seat lock (with a second-buyer rejection to prove no
double-booking), checkout, and notification — hitting the real
reservation-service and all four stubs:

```bash
bash scripts/demo-booking-flow.sh
```
