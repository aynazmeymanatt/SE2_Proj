// Billing & Checkout Domain — STUB
// Orchestrates the payment saga from the Sequence Diagram: on success,
// it would trigger ticket issuance; on failure/timeout, it releases the
// seat lock back in the Reservation Engine and publishes OrderStatusChanged
// to the message broker for the Notification service to consume.
// This stub simulates the gateway call and the compensating action, but
// does not call a real payment provider or a real message broker.

const express = require("express");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;

// POST /checkout { seatId, userId, amount } -> { status, ticketId? }
app.post("/checkout", async (req, res) => {
  const { seatId, userId, amount } = req.body;
  if (!seatId || !userId || !amount) {
    return res.status(400).json({ error: "seatId, userId and amount are required" });
  }

  // STUB: simulate a payment gateway call. Replace with a real gateway
  // SDK call in production, wrapped in the circuit breaker described in
  // the Risk Analysis document.
  const paymentSucceeds = Math.random() > 0.1; // ~90% success rate, for demo purposes

  if (!paymentSucceeds) {
    // Compensating action: in the real system this calls
    // DELETE /seats/:seatId/lock on the Reservation Engine.
    console.log(`Payment failed for seat ${seatId}; releasing lock (stub) and notifying user`);
    return res.status(402).json({ status: "payment_failed", seatId });
  }

  const ticketId = `ticket-${seatId}-${Date.now()}`;
  console.log(`Payment succeeded; issuing ${ticketId} and publishing OrderStatusChanged (stub)`);
  return res.status(201).json({ status: "success", ticketId, qrCodeHash: `qr-${ticketId}` });
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Billing service (stub) listening on ${PORT}`));
