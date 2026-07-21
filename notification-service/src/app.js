// Notification & Messaging Domain — STUB
// Consumes OrderStatusChanged events (see the Async Notification Flow
// sequence diagram) and dispatches SMS/Email. Here the "consumption" is
// a plain HTTP endpoint standing in for a real Kafka/RabbitMQ consumer.

const express = require("express");

function createApp() {
  const app = express();
  app.use(express.json());

  app.post("/internal/order-status-changed", (req, res) => {
    const { userId, status, ticketId } = req.body;
    if (!userId || !status) {
      return res.status(400).json({ error: "userId and status are required" });
    }

    const message =
      status === "success"
        ? `Your ticket ${ticketId} is confirmed! 🎟️`
        : `Your booking could not be completed. Your seat has been released.`;

    console.log(`Notifying user ${userId}: ${message}`);
    return res.status(202).json({ delivered: true, channel: "email", message });
  });

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  return app;
}

module.exports = { createApp };
