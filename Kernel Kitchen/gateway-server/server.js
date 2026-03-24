/**
 * server.js — Node.js API Gateway
 *
 * OS Concept: Networking, IPC (Inter-Process Communication)
 *
 * This gateway:
 *  1. Exposes a REST API to the React client
 *  2. Forwards HTTP requests to the Python Simulation Engine
 *  3. Bridges Socket.IO events between the two sides (bi-directional relay)
 *
 * Communication Flow:
 *   React Client ←─ WebSocket ─→ Gateway ←─ WebSocket ─→ Python Engine
 *                ←─ REST ────→         ←─ HTTP ────→
 */

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { io: ioClient } = require("socket.io-client");

const routes = require("./routes");

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const SIM_ENGINE_URL = process.env.SIM_ENGINE_URL || "http://localhost:5000";

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount REST routes under /api
app.use("/api", routes);

// Root endpoint
app.get("/", (req, res) => {
    res.json({ service: "Order Confirmed — Gateway Server", status: "running" });
});

// ─── Gateway-side Socket.IO (server for React clients) ───────────────────────
const clientSocketServer = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

let connectedClients = 0;

clientSocketServer.on("connection", (socket) => {
    connectedClients++;
    console.log(`[Gateway] React client connected: ${socket.id}  (total: ${connectedClients})`);

    socket.on("disconnect", () => {
        connectedClients--;
        console.log(`[Gateway] React client disconnected: ${socket.id}  (total: ${connectedClients})`);
    });
});

// ─── Client-side Socket.IO (connects TO Python Simulation Engine) ─────────────
const simSocket = ioClient(SIM_ENGINE_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    transports: ["websocket", "polling"],
});

simSocket.on("connect", () => {
    console.log(`[Gateway] Connected to Simulation Engine at ${SIM_ENGINE_URL}`);
    // Broadcast to all React clients that the engine is up
    clientSocketServer.emit("engine_status", { status: "connected" });
});

simSocket.on("disconnect", (reason) => {
    console.warn(`[Gateway] Disconnected from Simulation Engine: ${reason}`);
    clientSocketServer.emit("engine_status", { status: "disconnected", reason });
});

simSocket.on("connect_error", (err) => {
    console.error(`[Gateway] Engine connection error: ${err.message}`);
    clientSocketServer.emit("engine_status", { status: "error", message: err.message });
});

// ─── Socket.IO Event Relay (IPC Bridge) ──────────────────────────────────────
// Any event the simulation engine emits gets relayed to all React clients
const RELAY_EVENTS = [
    "order_update",    // Order status changed
    "thread_spawned",  // New thread started
    "thread_done",     // Thread completed
    "snapshot",        // Full state snapshot
];

RELAY_EVENTS.forEach((event) => {
    simSocket.on(event, (data) => {
        // Relay: Python Engine → Gateway → React Clients
        clientSocketServer.emit(event, data);
        if (event !== "snapshot") {
            console.log(`[Relay] ${event}:`, JSON.stringify(data).slice(0, 120));
        }
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║   Order Confirmed — API Gateway              ║");
    console.log(`║   Listening on http://localhost:${PORT}          ║`);
    console.log(`║   Simulation Engine: ${SIM_ENGINE_URL}  ║`);
    console.log("╚══════════════════════════════════════════════╝");
});
