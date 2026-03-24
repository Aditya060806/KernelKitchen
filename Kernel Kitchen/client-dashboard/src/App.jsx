/**
 * App.jsx — Order Confirmed OS Dashboard
 *
 * Main application layout with sidebar navigation and real-time data.
 * Connects to the Gateway via Socket.IO and maintains global state.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./hooks/useSocket";
import MetricsPanel from "./components/MetricsPanel";
import OrderPanel from "./components/OrderPanel";
import QueueMonitor from "./components/QueueMonitor";
import ThreadsPanel from "./components/ThreadsPanel";
import OrderTimeline from "./components/OrderTimeline";

const VIEWS = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "place", label: "Place Order", icon: "🛒" },
    { id: "queue", label: "Queue Monitor", icon: "📋" },
    { id: "threads", label: "Thread Monitor", icon: "🧵" },
    { id: "timeline", label: "Order Timeline", icon: "📡" },
];

const now = () => new Date().toLocaleTimeString();

export default function App() {
    const { connected, engineStatus, on } = useSocket();
    const [view, setView] = useState("dashboard");
    const [orders, setOrders] = useState([]);
    const [activeThreads, setActiveThreads] = useState([]);
    const [logs, setLogs] = useState([]);

    const addLog = useCallback((type, msg) => {
        setLogs((prev) => [{ type, msg, ts: now() }, ...prev.slice(0, 49)]);
    }, []);

    // ── Socket Event Handlers ─────────────────────────────────────
    useEffect(() => {
        const offSnapshot = on("snapshot", (data) => {
            setOrders(data.orders || []);
            addLog("info", "Snapshot received from simulation engine.");
        });

        const offOrderUpdate = on("order_update", (order) => {
            setOrders((prev) => {
                const idx = prev.findIndex((o) => o.order_id === order.order_id);
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = order;
                    return next;
                }
                return [order, ...prev];
            });
            addLog(
                order.status === "Delivered" ? "success" : order.status === "Preparing" ? "warn" : "info",
                `Order ${order.order_id.slice(0, 12)}… → ${order.status}`
            );
        });

        const offThreadSpawned = on("thread_spawned", (data) => {
            setActiveThreads((prev) => {
                if (prev.find((t) => t.order_id === data.order_id)) return prev;
                return [
                    ...prev,
                    {
                        order_id: data.order_id,
                        thread_name: data.thread_name,
                        order_type: data.order_type,
                        priority: data.priority,
                        thread_id: null,
                    },
                ];
            });
            addLog("warn", `Thread spawned: ${data.thread_name} (${data.order_type})`);
        });

        const offOrderUpdate2 = on("order_update", (data) => {
            // Sync thread_id from order update
            if (data.thread_id) {
                setActiveThreads((prev) =>
                    prev.map((t) =>
                        t.order_id === data.order_id ? { ...t, thread_id: data.thread_id } : t
                    )
                );
            }
        });

        const offThreadDone = on("thread_done", (data) => {
            setActiveThreads((prev) => prev.filter((t) => t.order_id !== data.order_id));
            addLog("success", `Thread done: ${data.thread_name} in ${data.total_time}s`);
        });

        const offEngineStatus = on("engine_status", (data) => {
            addLog(
                data.status === "connected" ? "success" : "error",
                `Engine status: ${data.status}`
            );
        });

        return () => {
            offSnapshot?.();
            offOrderUpdate?.();
            offThreadSpawned?.();
            offOrderUpdate2?.();
            offThreadDone?.();
            offEngineStatus?.();
        };
    }, [on, addLog]);

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="app-shell">
            {/* ── Sidebar ── */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <h2>Order Confirmed</h2>
                    <p>OS Simulation Dashboard</p>
                </div>

                <div className="nav-section-label">Navigation</div>

                {VIEWS.map((v) => (
                    <button
                        key={v.id}
                        id={`nav-${v.id}`}
                        className={`nav-item ${view === v.id ? "active" : ""}`}
                        onClick={() => setView(v.id)}
                    >
                        <span className="nav-icon">{v.icon}</span>
                        {v.label}
                    </button>
                ))}

                <div className="nav-section-label" style={{ marginTop: 8 }}>
                    OS Concepts
                </div>
                {[
                    ["🔄", "Multithreading"],
                    ["📊", "Priority Scheduling"],
                    ["🔒", "Mutex Locks"],
                    ["📨", "IPC / WebSockets"],
                    ["⚖️", "Synchronization"],
                ].map(([icon, label]) => (
                    <div
                        key={label}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 12px",
                            fontSize: 11,
                            color: "var(--text-muted)",
                        }}
                    >
                        <span>{icon}</span> {label}
                    </div>
                ))}

                <div className="sidebar-footer">
                    <div className="engine-status">
                        <div className={`status-dot ${engineStatus === "connected" ? "connected" : ""}`} />
                        {engineStatus === "connected"
                            ? "Engine Online"
                            : engineStatus === "disconnected"
                                ? "Engine Offline"
                                : "Reconnecting…"}
                    </div>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: "var(--text-muted)",
                            marginTop: 6,
                        }}
                    >
                        {connected ? "✓ Gateway Connected" : "✕ Gateway Disconnected"}
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="main-content">
                {/* Top Bar */}
                <div className="topbar">
                    <div className="topbar-title">
                        <h1>
                            {VIEWS.find((v) => v.id === view)?.icon}{" "}
                            {VIEWS.find((v) => v.id === view)?.label}
                        </h1>
                        <p>
                            {view === "dashboard" && "Real-time OS metrics and system overview"}
                            {view === "place" && "Submit a new order to the scheduler (POST /api/order)"}
                            {view === "queue" && "Priority ready queue — pending orders"}
                            {view === "threads" && "Active threads — CPU burst simulation"}
                            {view === "timeline" && "Per-order process state transitions"}
                        </p>
                    </div>
                    <div className="topbar-badges">
                        <span className={`badge ${connected ? "badge-green" : "badge-red"}`}>
                            {connected ? "◉ Live" : "◎ Offline"}
                        </span>
                        <span className="badge badge-blue">{orders.length} Orders</span>
                        <span className="badge badge-purple">{activeThreads.length} Threads</span>
                    </div>
                </div>

                {/* Page Content */}
                <div className="page-content fade-in">
                    {view === "dashboard" && <DashboardView orders={orders} activeThreads={activeThreads} logs={logs} socketOn={on} />}
                    {view === "place" && <OrderPanel onOrderPlaced={() => { }} />}
                    {view === "queue" && <QueueMonitor orders={orders} />}
                    {view === "threads" && <ThreadsPanel threads={activeThreads} socketOn={on} />}
                    {view === "timeline" && <OrderTimeline orders={orders} />}
                </div>
            </main>
        </div>
    );
}

/* ── Dashboard View (combined overview) ──────────────────────────── */
function DashboardView({ orders, activeThreads, logs, socketOn }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Metrics */}
            <MetricsPanel socketOn={socketOn} />

            {/* Two column layout */}
            <div className="dashboard-grid grid-2" style={{ gap: 16 }}>
                {/* Left: Order Form + Queue */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <OrderPanel />
                    <QueueMonitor orders={orders} />
                </div>

                {/* Right: Threads + Timeline */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <ThreadsPanel threads={activeThreads} socketOn={socketOn} />
                    <OrderTimeline orders={orders.slice(0, 4)} />
                </div>
            </div>

            {/* Activity Log */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <span className="card-icon">🖥️</span>
                        System Activity Log
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "var(--text-muted)",
                            }}
                        >
                            — IPC Event Stream
                        </span>
                    </div>
                    <span className="badge badge-gray">{logs.length} events</span>
                </div>
                <div className="card-body">
                    <div className="log-box">
                        {logs.length === 0 ? (
                            <div style={{ color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
                                Waiting for activity…
                            </div>
                        ) : (
                            logs.map((l, i) => (
                                <div key={i} className={`log-line ${l.type}`}>
                                    <span className="ts">{l.ts}</span>
                                    <span className="tag">
                                        {l.type === "info" ? "[INFO]" : l.type === "success" ? "[DONE]" : l.type === "warn" ? "[UPDT]" : "[ERR]"}
                                    </span>
                                    {l.msg}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
