// Notification & Messaging Domain — STUB
// Consumes OrderStatusChanged events (see the Async Notification Flow
// sequence diagram) and dispatches SMS/Email. Here the "consumption" is
// a plain HTTP endpoint standing in for a real Kafka/RabbitMQ consumer.

const express = require("express");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3005;

// POST /internal/order-status-changed { userId, status, ticketId? }
app.post("/internal/order-status-changed", (req, res) => {
  const { userId, status, ticketId } = req.body;

  // STUB: in production this calls a real SMS/Email provider and would
  // retry with backoff / dead-letter on failure, per the sequence diagram.
  const message =
    status === "success"
      ? `Your ticket ${ticketId} is confirmed! 🎟️`
      : `Your booking could not be completed. Your seat has been released.`;

  console.log(`Notifying user ${userId}: ${message}`);
  return res.status(202).json({ delivered: true, channel: "email", message });
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Notification service (stub) listening on ${PORT}`));
