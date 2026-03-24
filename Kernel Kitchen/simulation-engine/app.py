"""
app.py — Simulation Engine Main Server
OS Concept: IPC via WebSockets (analogous to message passing between processes)

Architecture:
  React Client ←→ Node Gateway ←→ [THIS] Python Simulation Engine
"""

import os
import uuid
import logging
import time
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

from order_queue import Order, OrderQueue, PRIORITY_MAP
from scheduler import Scheduler

# ─── Logging Setup ────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("SimulationEngine")

# ─── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["SECRET_KEY"] = "os-assignment-secret"

# Allow cross-origin from Node gateway and React dev server
CORS(app, resources={r"/*": {"origins": "*"}})

# Use a runtime-selectable async mode. Default to threading for Python 3.14
# compatibility (eventlet currently fails on newer Python versions).
SOCKETIO_ASYNC_MODE = os.environ.get("SOCKETIO_ASYNC_MODE", "threading")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode=SOCKETIO_ASYNC_MODE, logger=False)

# ─── Core OS Components ───────────────────────────────────────────────────────
order_queue = OrderQueue()
scheduler = None   # Initialized after socketio is ready

# Track server start time for uptime metric
SERVER_START = time.time()


def broadcast(event: str, data: dict):
    """
    IPC Bridge: emit Socket.IO event to all connected clients.
    This simulates inter-process communication (message passing model).
    """
    socketio.emit(event, data)


# ─── REST Endpoints ───────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "simulation-engine"}), 200


@app.route("/api/order", methods=["POST"])
def place_order():
    """
    Accept a new order, enqueue it with proper priority.
    OS Concept: Submitting a new process to the scheduler.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    order_type = data.get("order_type", "Normal")
    if order_type not in PRIORITY_MAP:
        return jsonify({"error": f"Invalid order_type. Must be one of {list(PRIORITY_MAP.keys())}"}), 400

    order = Order(
        priority=PRIORITY_MAP[order_type],
        order_id=str(uuid.uuid4()),
        customer_name=data.get("customer_name", "Anonymous"),
        items=data.get("items", []),
        order_type=order_type,
        status="Confirmed",
    )

    order_queue.enqueue(order)
    logger.info(f"Order {order.order_id} ({order_type}) enqueued. Queue length: {order_queue.queue_length()}")

    # Immediately broadcast the new "Confirmed" order to all clients
    broadcast("order_update", order.to_dict())

    return jsonify({"success": True, "order": order.to_dict()}), 201


@app.route("/api/orders", methods=["GET"])
def get_orders():
    """Return all orders (current state snapshot)."""
    return jsonify(order_queue.get_all_orders()), 200


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """
    Return live OS metrics for the monitoring dashboard.
    Includes queue stats, thread info, and system uptime.
    """
    threads = scheduler.get_thread_info() if scheduler else []
    queue_metrics = order_queue.get_metrics()

    return jsonify({
        "queue": queue_metrics,
        "threads": {
            "active": len(threads),
            "max_concurrent": 5,
            "details": threads,
            "completed": scheduler.get_completed_count() if scheduler else 0,
        },
        "uptime_seconds": round(time.time() - SERVER_START, 1),
    }), 200


@app.route("/api/order/<order_id>", methods=["GET"])
def get_order(order_id):
    """Get a single order by ID."""
    order = order_queue.get_order(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.to_dict()), 200


# ─── Socket.IO Events ─────────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    logger.info(f"Client connected: {request.sid}")
    # Send current state snapshot to newly connected client
    emit("snapshot", {
        "orders": order_queue.get_all_orders(),
        "metrics": {
            "queue": order_queue.get_metrics(),
            "threads": {
                "active": len(scheduler.get_thread_info()) if scheduler else 0,
                "completed": scheduler.get_completed_count() if scheduler else 0,
            }
        }
    })


@socketio.on("disconnect")
def on_disconnect():
    logger.info(f"Client disconnected: {request.sid}")


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("Starting OS Simulation Engine...")
    logger.info(f"Socket.IO async mode: {SOCKETIO_ASYNC_MODE}")

    # Start the priority scheduler (background dispatcher thread)
    scheduler = Scheduler(order_queue, broadcast)
    scheduler.start()
    logger.info("Priority Scheduler started — VIP > Express > Normal")

    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Simulation Engine running on port {port}")
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
