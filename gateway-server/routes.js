/**
 * routes.js — REST API Route Definitions
 *
 * All routes forward requests to the Python Simulation Engine,
 * acting as a transparent API Gateway / proxy layer.
 */

const express = require("express");
const axios = require("axios");

const router = express.Router();
const SIM_ENGINE_URL = process.env.SIM_ENGINE_URL || "http://localhost:5000";

// Helper: forward request to simulation engine
async function forward(method, path, data = null) {
  const url = `${SIM_ENGINE_URL}${path}`;
  const config = { method, url, data, timeout: 10000 };
  const response = await axios(config);
  return response.data;
}

// ─── Order Endpoints ────────────────────────────────────────────────────────

/**
 * POST /api/order
 * Place a new order → forwarded to simulation engine
 */
router.post("/order", async (req, res) => {
  try {
    const result = await forward("post", "/api/order", req.body);
    res.status(201).json(result);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || err.message;
    res.status(status).json({ error: message });
  }
});

/**
 * GET /api/orders
 * Get all orders (current state snapshot)
 */
router.get("/orders", async (req, res) => {
  try {
    const result = await forward("get", "/api/orders");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/order/:id
 * Get a single order by ID
 */
router.get("/order/:id", async (req, res) => {
  try {
    const result = await forward("get", `/api/order/${req.params.id}`);
    res.json(result);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/metrics
 * Get live OS metrics: queue length, active threads, uptime
 */
router.get("/metrics", async (req, res) => {
  try {
    const result = await forward("get", "/api/metrics");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/health
 * Gateway health check (checks both gateway and sim engine)
 */
router.get("/health", async (req, res) => {
  try {
    const simHealth = await forward("get", "/health");
    res.json({
      gateway: "ok",
      simulation_engine: simHealth.status,
    });
  } catch (err) {
    res.status(503).json({
      gateway: "ok",
      simulation_engine: "unreachable",
      error: err.message,
    });
  }
});

module.exports = router;
