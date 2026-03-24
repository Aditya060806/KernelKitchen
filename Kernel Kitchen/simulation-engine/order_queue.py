"""
order_queue.py — Thread-Safe Priority Order Queue
OS Concept: Synchronization, Critical Sections, Mutex Locks
"""

import queue
import threading
import time
from dataclasses import dataclass, field
from typing import Optional


# Priority levels map to OS scheduling priorities
PRIORITY_MAP = {
    "VIP": 1,       # Highest priority (like real-time process)
    "Express": 2,   # Medium-high priority
    "Normal": 3,    # Standard priority (like background process)
}


@dataclass(order=True)
class Order:
    """Represents a single customer order in the system."""
    priority: int                   # Scheduling priority (lower = higher)
    order_id: str = field(compare=False)
    customer_name: str = field(compare=False)
    items: list = field(compare=False, default_factory=list)
    order_type: str = field(compare=False, default="Normal")  # Normal / Express / VIP
    status: str = field(compare=False, default="Confirmed")
    created_at: float = field(compare=False, default_factory=time.time)
    thread_id: Optional[int] = field(compare=False, default=None)

    def to_dict(self) -> dict:
        return {
            "order_id": self.order_id,
            "customer_name": self.customer_name,
            "items": self.items,
            "order_type": self.order_type,
            "status": self.status,
            "priority": self.priority,
            "created_at": self.created_at,
            "thread_id": self.thread_id,
        }


class OrderQueue:
    """
    Thread-safe priority queue for orders.

    OS Concepts Demonstrated:
    - Mutex Lock (threading.Lock) — guards shared state (critical section)
    - Priority Queue — simulates OS scheduling priority levels
    - Condition Variables — waiting when queue is empty
    """

    def __init__(self):
        self._pq = queue.PriorityQueue()        # Underlying priority queue
        self._lock = threading.Lock()            # Mutex lock for shared state
        self._active_orders: dict[str, Order] = {}  # All known orders
        self._metrics = {
            "total_enqueued": 0,
            "total_processed": 0,
            "total_delivered": 0,
        }

    def enqueue(self, order: Order) -> None:
        """Add an order to the priority queue (critical section)."""
        with self._lock:   # Acquire mutex — critical section start
            self._pq.put((order.priority, order.created_at, order))
            self._active_orders[order.order_id] = order
            self._metrics["total_enqueued"] += 1
        # Mutex automatically released — critical section end

    def dequeue(self) -> Optional[Order]:
        """Remove and return the highest-priority order (blocks if empty)."""
        try:
            _, _, order = self._pq.get(timeout=1)
            return order
        except queue.Empty:
            return None

    def update_status(self, order_id: str, status: str, thread_id: int = None) -> Optional[Order]:
        """Update order status safely with mutex lock."""
        with self._lock:
            if order_id in self._active_orders:
                order = self._active_orders[order_id]
                order.status = status
                if thread_id:
                    order.thread_id = thread_id
                if status == "Delivered":
                    self._metrics["total_delivered"] += 1
                elif status == "Preparing":
                    self._metrics["total_processed"] += 1
                return order
        return None

    def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID (read-only, still needs lock for consistency)."""
        with self._lock:
            return self._active_orders.get(order_id)

    def get_all_orders(self) -> list:
        """Return snapshot of all orders."""
        with self._lock:
            return [o.to_dict() for o in self._active_orders.values()]

    def queue_length(self) -> int:
        """Return number of pending orders in queue."""
        return self._pq.qsize()

    def get_metrics(self) -> dict:
        """Return queue metrics for the OS monitoring dashboard."""
        with self._lock:
            return {
                **self._metrics,
                "queue_length": self._pq.qsize(),
            }
