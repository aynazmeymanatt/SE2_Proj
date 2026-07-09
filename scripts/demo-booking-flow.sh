#!/usr/bin/env bash
# End-to-end demo of the booking flow from the Sequence Diagram:
# login -> search -> lock seat -> checkout -> notification.
#
# Run `docker compose up --build` in another terminal first, then:
#   bash scripts/demo-booking-flow.sh
#
# This wires together the one real service (reservation-service) with the
# four stubs to prove the pieces fit the shape drawn in the diagrams —
# it is not a substitute for the reservation-service unit/concurrency tests.

set -euo pipefail

IDENTITY_URL="http://localhost:3002"
CATALOG_URL="http://localhost:3003"
RESERVATION_URL="http://localhost:3001"
BILLING_URL="http://localhost:3004"
NOTIFICATION_URL="http://localhost:3005"

SEAT_ID="A1-${RANDOM}"
USER_ID="buyer-1"

step() { echo -e "\n\033[1;34m==> $1\033[0m"; }

step "1. Login (Identity Service)"
LOGIN_RESPONSE=$(curl -sf -X POST "$IDENTITY_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}")
echo "$LOGIN_RESPONSE"

step "2. Search events (Catalog Service)"
curl -sf "$CATALOG_URL/events?genre=music"
echo

step "3. Lock a seat (Reservation Engine)"
LOCK_RESPONSE=$(curl -sf -X POST "$RESERVATION_URL/seats/$SEAT_ID/lock" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}")
echo "$LOCK_RESPONSE"

step "3b. Confirm a second buyer is correctly rejected (no double-booking)"
set +e
REJECTION=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$RESERVATION_URL/seats/$SEAT_ID/lock" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"buyer-2\"}")
set -e
if [ "$REJECTION" = "409" ]; then
  echo "OK: second buyer got HTTP 409 as expected"
else
  echo "UNEXPECTED: second buyer got HTTP $REJECTION"
fi

step "4. Checkout (Billing Service)"
CHECKOUT_RESPONSE=$(curl -sf -X POST "$BILLING_URL/checkout" \
  -H "Content-Type: application/json" \
  -d "{\"seatId\": \"$SEAT_ID\", \"userId\": \"$USER_ID\", \"amount\": 50}" || true)
echo "$CHECKOUT_RESPONSE"

STATUS=$(echo "$CHECKOUT_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
TICKET_ID=$(echo "$CHECKOUT_RESPONSE" | grep -o '"ticketId":"[^"]*"' | cut -d'"' -f4 || echo "")

step "5. Notify user of the outcome (Notification Service)"
curl -sf -X POST "$NOTIFICATION_URL/internal/order-status-changed" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"status\": \"$STATUS\", \"ticketId\": \"$TICKET_ID\"}"
echo

if [ "$STATUS" = "payment_failed" ]; then
  step "6. Payment failed -> releasing the seat lock (compensating action)"
  curl -sf -X DELETE "$RESERVATION_URL/seats/$SEAT_ID/lock" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$USER_ID\"}"
  echo
fi

step "Done. Final seat status:"
curl -sf "$RESERVATION_URL/seats/$SEAT_ID/status"
echo
