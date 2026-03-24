# Order Confirmed — OS Assignment

A hybrid distributed system simulating a real-time food delivery workflow to demonstrate core **Operating System concepts**: multithreading, priority scheduling, IPC, synchronization, and networking.

## Architecture

```
React Dashboard (port 5173)
        │  REST + WebSocket
        ▼
Node.js Gateway (port 4000)
        │  HTTP + WebSocket relay
        ▼
Python Simulation Engine (port 5000)
  ├── Priority Queue (OrderQueue)
  ├── Thread Scheduler (Scheduler)
  └── Socket.IO broadcast (IPC)
```

## OS Concepts Mapped

| Component | OS Concept |
|---|---|
| `OrderQueue` | Ready Queue, Mutex Lock, Critical Section |
| `Scheduler` | Priority Scheduling (VIP > Express > Normal) |
| `OrderProcessor` | Thread / Process Lifecycle |
| Socket.IO Events | IPC — Message Passing |
| Concurrent Orders | Multiprocessing / Concurrency |
| Thread Sleep | I/O Wait / Blocked State |

## Project Structure

```
OS Assignment/
├── simulation-engine/     # Python Flask + Socket.IO
│   ├── app.py             # Main server + REST endpoints
│   ├── scheduler.py       # Priority scheduler + thread spawning
│   ├── order_queue.py     # Thread-safe priority queue
│   └── requirements.txt
│
├── gateway-server/        # Node.js Express
│   ├── server.js          # Gateway + Socket.IO relay
│   ├── routes.js          # REST API routes
│   ├── package.json
│   └── .env
│
└── client-dashboard/      # React + Vite
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css
    │   ├── hooks/useSocket.js
    │   └── components/
    │       ├── MetricsPanel.jsx   # Live OS metrics
    │       ├── OrderPanel.jsx     # Place orders
    │       ├── QueueMonitor.jsx   # Queue visualization
    │       ├── ThreadsPanel.jsx   # Thread lifecycle
    │       └── OrderTimeline.jsx  # Process state diagram
    └── package.json
```

## Setup & Run

> **Requires:** Python 3.9+, Node.js 18+, npm

### Step 1 — Python Simulation Engine

```powershell
cd "simulation-engine"
pip install -r requirements.txt
python app.py
# Running on http://localhost:5000
```

### Step 2 — Node.js Gateway (new terminal)

```powershell
cd "gateway-server"
npm install
node server.js
# Running on http://localhost:4000
```

### Step 3 — React Dashboard (new terminal)

```powershell
cd "client-dashboard"
npm install
npm run dev
# Running on http://localhost:5173
```

### Step 4 — Open Browser

Navigate to **[http://localhost:5173](http://localhost:5173)**

## Deploy Full Project (Render)

This repository already includes `render.yaml` for one-click Blueprint deployment of all 3 services.

### 1. Push code to GitHub

- Commit and push this project to a GitHub repository.

### 2. Create Render Blueprint

- In Render: **New +** -> **Blueprint**
- Connect your GitHub repo.
- Render will detect `render.yaml` and create:
        - `kernelkitchen-engine` (Python)
        - `kernelkitchen-gateway` (Node)
        - `kernelkitchen-client` (Static site)

### 3. Verify environment wiring

`render.yaml` already wires these automatically:

- `SIM_ENGINE_URL` in gateway -> engine's external URL
- `VITE_API_URL` in client -> gateway's external URL

### 4. Deploy order and health checks

- Deploy the Blueprint.
- Wait until all 3 services show **Live**.
- Test in order:
        - Engine health: `https://<engine-url>/health`
        - Gateway health: `https://<gateway-url>/api/health`
        - Client app: `https://<client-url>`

### 5. Post-deploy smoke test

- Open the client URL.
- Place one **VIP** order and one **Normal** order.
- Confirm dashboard updates (`order_update`, `thread_spawned`, `thread_done`) and queue priority behavior.

### Notes

- Free plans may cold-start/sleep. First request can be slow.
- If WebSocket reconnect messages appear briefly after sleep, this is expected on free tiers.

## API Reference

### Python Engine (port 5000)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/order` | Place new order |
| GET | `/api/orders` | Get all orders |
| GET | `/api/metrics` | Live OS metrics |
| GET | `/health` | Health check |

### Node Gateway (port 4000)
Same endpoints prefixed with `/api/`.

### WebSocket Events (both ports)
| Event | Direction | Description |
|---|---|---|
| `order_update` | Server → Client | Order status changed |
| `thread_spawned` | Server → Client | New thread started |
| `thread_done` | Server → Client | Thread completed |
| `snapshot` | Server → Client | Full state on connect |
| `engine_status` | Gateway → Client | Engine connectivity |

## Order Priority Levels

| Level | OS Analogy | Processing Time |
|---|---|---|
| Normal | Background Process | ~25–27 seconds |
| Express | Interactive Process | ~14–17 seconds |
| VIP | Real-Time Process | ~6–10 seconds |

## Short Description (for assignment submission)

The **Order Confirmed** system is a hybrid distributed application that simulates a real-time food delivery workflow. A Python-based simulation engine models operating system concepts such as process scheduling, multithreading, and synchronization. A Node.js gateway manages client communication via REST and WebSocket forwarding, while a React dashboard provides real-time monitoring of queue state, thread activity, and order lifecycle transitions. The project demonstrates how OS networking principles (IPC, message passing, shared state) operate in modern client-server applications.
