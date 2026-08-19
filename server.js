// IPL Auction Arena — minimal backend
// Serves the static app and provides a tiny REST API that stores each room's
// authoritative game state in memory. Clients poll GET and write via POST.
// Good enough for a handful of friends; not meant to survive a server restart
// (rooms live in memory for the lifetime of the process).

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "2mb" }));

// In-memory room store: { CODE: { value: "<json string>", updatedAt } }
const rooms = {};
// SSE subscribers per room: { CODE: Set<express.Response> }
const sseClients = {};

// Basic cleanup: drop rooms untouched for 12 hours so memory doesn't grow forever.
setInterval(() => {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const code of Object.keys(rooms)) {
    if (rooms[code].updatedAt < cutoff) {
      delete rooms[code];
      if (sseClients[code]) delete sseClients[code];
    }
  }
}, 60 * 60 * 1000);

app.get("/api/room/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const r = rooms[code];
  if (!r) return res.status(404).json({ error: "not found" });
  res.json({ value: r.value });
});

// SSE endpoint for instant real-time room updates (overcomes polling latency)
app.get("/api/room/:code/events", (req, res) => {
  const code = req.params.code.toUpperCase();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (res.flushHeaders) res.flushHeaders();

  if (!sseClients[code]) sseClients[code] = new Set();
  sseClients[code].add(res);

  if (rooms[code]) {
    res.write(`data: ${JSON.stringify({ value: rooms[code].value })}\n\n`);
  }

  req.on("close", () => {
    if (sseClients[code]) {
      sseClients[code].delete(res);
      if (sseClients[code].size === 0) delete sseClients[code];
    }
  });
});

app.post("/api/room/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { value } = req.body || {};
  if (typeof value !== "string") {
    return res.status(400).json({ error: "value (string) is required" });
  }
  rooms[code] = { value, updatedAt: Date.now() };

  // Broadcast state update to all connected SSE clients immediately
  if (sseClients[code]) {
    const payload = `data: ${JSON.stringify({ value })}\n\n`;
    for (const clientRes of sseClients[code]) {
      clientRes.write(payload);
    }
  }

  res.json({ ok: true });
});

app.delete("/api/room/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  delete rooms[code];
  if (sseClients[code]) delete sseClients[code];
  res.json({ ok: true });
});

app.get("/api/health", (req, res) => res.json({ ok: true, rooms: Object.keys(rooms).length }));

// Serve the static single-page app for everything else
app.use(express.static(path.join(__dirname)));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("IPL Auction Arena running on port " + PORT);
});
