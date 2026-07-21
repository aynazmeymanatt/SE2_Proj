// Event Catalog & Discovery Domain — STUB
// Owns event/venue search per the Component Diagram. In the real design,
// this service holds a denormalized, eventually-consistent copy of seat
// availability, kept fresh by consuming SeatAvailabilityChanged events
// from the message broker (see the Bounded Context diagram) rather than
// calling the Reservation Engine synchronously.

const express = require("express");

const EVENTS = [
  { id: "evt-1", name: "Summer Music Fest", venue: "Central Arena", date: "2026-08-14", genre: "music", availableSeats: 1200 },
  { id: "evt-2", name: "City Derby Final", venue: "Riverside Stadium", date: "2026-09-02", genre: "sports", availableSeats: 340 },
];

function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/events", (req, res) => {
    const { genre, date } = req.query;
    const results = EVENTS.filter(
      (e) => (!genre || e.genre === genre) && (!date || e.date === date)
    );
    return res.json({ results });
  });

  app.get("/events/:id", (req, res) => {
    const event = EVENTS.find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: "not_found" });
    return res.json(event);
  });

  // STUB handler for the async sync flow described in the Bounded Context
  // doc: in a real deployment this is a Kafka consumer, not an HTTP route.
  app.post("/internal/seat-availability-changed", (req, res) => {
    console.log("received SeatAvailabilityChanged event (stub):", req.body);
    return res.status(202).json({ received: true });
  });

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  return app;
}

module.exports = { createApp, EVENTS };
