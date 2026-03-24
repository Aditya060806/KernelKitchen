"""
scheduler.py — Priority-Based Order Scheduler
OS Concept: Process Scheduling, Multithreading, Thread Lifecycle Management
"""

import threading
import time
import random
import logging
from typing import Callable
from order_queue import Order, OrderQueue

logger = logging.getLogger(__name__)


# Simulated timing ranges (seconds) for each delivery phase
PHASE_TIMINGS = {
    "VIP":     {"Preparing": (3, 5),  "Out for Delivery": (3, 5)},
    "Express": {"Preparing": (6, 9),  "Out for Delivery": (5, 8)},
    "Normal":  {"Preparing": (10, 15), "Out for Delivery": (8, 12)},
}


class OrderProcessor(threading.Thread):
    """
    OS Concept: Thread (analogous to a Process in OS terms)

    Each order gets its own thread:
    - Thread creation  = process creation (fork)
    - Thread execution = CPU burst
    - Thread sleep     = I/O wait / blocked state
    - Thread exit      = process termination

    Thread States Demonstrated:
    NEW → READY → RUNNING → WAITING (sleep) → RUNNING → TERMINATED
    """

    def __init__(self, order: Order, order_queue: OrderQueue, broadcast_fn: Callable):
        super().__init__(daemon=True, name=f"OrderThread-{order.order_id[:8]}")
        self.order = order
        self.order_queue = order_queue
        self.broadcast = broadcast_fn  # IPC: callback to broadcast via socket
        self._start_time = None

    def run(self):
        """
        Simulates the full order lifecycle within this thread.
        Each phase transition is broadcast to all connected clients (IPC via WebSocket).
        """
        self._start_time = time.time()
        thread_id = threading.get_ident()

        logger.info(f"[Thread {thread_id}] Starting order {self.order.order_id} ({self.order.order_type})")

        timings = PHASE_TIMINGS.get(self.order.order_type, PHASE_TIMINGS["Normal"])

        phases = [
            ("Preparing",        timings["Preparing"]),
            ("Out for Delivery", timings["Out for Delivery"]),
            ("Delivered",        None),
        ]

        for status, duration_range in phases:
            # Transition to next status
            updated = self.order_queue.update_status(
                self.order.order_id, status, thread_id=thread_id
            )
            if updated:
                elapsed = round(time.time() - self._start_time, 2)
                payload = {
                    **updated.to_dict(),
                    "thread_name": self.name,
                    "elapsed_seconds": elapsed,
                }
                # IPC: broadcast status update to all clients via Socket.IO
                self.broadcast("order_update", payload)
                logger.info(f"[Thread {thread_id}] Order {self.order.order_id} → {status}")

            # Simulate work (CPU burst + I/O wait)
            if duration_range:
                sleep_time = random.uniform(*duration_range)
                time.sleep(sleep_time)

        elapsed_total = round(time.time() - self._start_time, 2)
        logger.info(f"[Thread {thread_id}] Order {self.order.order_id} completed in {elapsed_total}s")

        # Broadcast thread completion for the threads monitor panel
        self.broadcast("thread_done", {
            "order_id": self.order.order_id,
            "thread_id": thread_id,
            "thread_name": self.name,
            "total_time": elapsed_total,
        })


class Scheduler:
    """
    Priority-Based Preemptive Scheduler Simulation.

    OS Concepts:
    - Priority Scheduling (VIP > Express > Normal)
    - Thread Pool awareness (tracks active threads)
    - Thread Lifecycle management
    """

    MAX_CONCURRENT_THREADS = 5  # Simulates CPU core limit

    def __init__(self, order_queue: OrderQueue, broadcast_fn: Callable):
        self.order_queue = order_queue
        self.broadcast = broadcast_fn
        self._active_threads: dict[str, OrderProcessor] = {}
        self._lock = threading.Lock()
        self._running = False
        self._dispatcher_thread = None
        self._completed_threads: list[dict] = []

    def start(self):
        """Start the background dispatcher thread."""
        self._running = True
        self._dispatcher_thread = threading.Thread(
            target=self._dispatch_loop,
            daemon=True,
            name="SchedulerDispatcher"
        )
        self._dispatcher_thread.start()
        logger.info("Scheduler dispatcher started.")

    def stop(self):
        """Gracefully stop the scheduler."""
        self._running = False

    def _dispatch_loop(self):
        """
        Continuously polls the priority queue and dispatches threads.
        Simulates the OS scheduler picking the next process to run.
        """
        while self._running:
            # Clean up finished threads
            self._reap_dead_threads()

            # Respect max concurrency (simulates core limit)
            with self._lock:
                active_count = len(self._active_threads)

            if active_count >= self.MAX_CONCURRENT_THREADS:
                time.sleep(0.5)
                continue

            # Dequeue highest-priority order
            order = self.order_queue.dequeue()
            if order is None:
                time.sleep(0.3)
                continue

            # Spawn a new thread for this order
            processor = OrderProcessor(order, self.order_queue, self.broadcast)
            with self._lock:
                self._active_threads[order.order_id] = processor

            processor.start()

            # Notify dashboard of new thread
            self.broadcast("thread_spawned", {
                "order_id": order.order_id,
                "thread_name": processor.name,
                "order_type": order.order_type,
                "priority": order.priority,
            })

    def _reap_dead_threads(self):
        """Remove completed threads (simulates OS process cleanup / zombie reaping)."""
        with self._lock:
            dead = [oid for oid, t in self._active_threads.items() if not t.is_alive()]
            for oid in dead:
                t = self._active_threads.pop(oid)
                self._completed_threads.append({
                    "order_id": oid,
                    "thread_name": t.name,
                })

    def get_thread_info(self) -> list:
        """Return active thread snapshot for monitoring dashboard."""
        with self._lock:
            return [
                {
                    "order_id": oid,
                    "thread_name": t.name,
                    "is_alive": t.is_alive(),
                    "thread_id": t.ident,
                }
                for oid, t in self._active_threads.items()
            ]

    def get_completed_count(self) -> int:
        return len(self._completed_threads)
