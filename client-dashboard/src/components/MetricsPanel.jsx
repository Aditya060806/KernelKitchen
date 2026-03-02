/**
 * MetricsPanel.jsx — OS Monitoring Metrics Dashboard
 *
 * Displays live OS-concept metrics:
 * - Queue length (pending orders)
 * - Active threads (concurrent processes)
 * - Orders delivered (completed processes)
 * - System uptime
 */

import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const STATUS_COLORS = {
    Confirmed: "var(--accent)",
    Preparing: "var(--yellow)",
    "Out for Delivery": "var(--orange)",
    Delivered: "var(--green)",
};

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export default function MetricsPanel({ socketOn }) {
    const [metrics, setMetrics] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchMetrics = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/metrics`);
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
                setHistory(prev => {
                    const next = [...prev, {
                        time: new Date(),
                        queue: data.queue?.queue_length || 0,
                        active: data.threads?.active || 0
                    }];
                    return next.slice(-20); // Keep last 20 ticks
                });
            }
        } catch (_) { /* engine may be offline */ }
    }, []);

    // Poll every 3 seconds
    useEffect(() => {
        fetchMetrics();
        const id = setInterval(fetchMetrics, 3000);
        return () => clearInterval(id);
    }, [fetchMetrics]);

    // Also refresh on order updates via socket
    useEffect(() => {
        if (!socketOn) return;
        const off = socketOn("order_update", () => setTimeout(fetchMetrics, 600));
        return off;
    }, [socketOn, fetchMetrics]);

    const cards = [
        {
            label: "Queue Length",
            value: metrics?.queue?.queue_length ?? "–",
            sub: "Pending orders",
            color: "var(--accent)",
            icon: "📋",
            osNote: "Ready Queue",
        },
        {
            label: "Active Threads",
            value: metrics?.threads?.active ?? "–",
            sub: `Max: ${metrics?.threads?.max_concurrent ?? 5}`,
            color: "var(--purple)",
            icon: "🧵",
            osNote: "CPU Burst",
        },
        {
            label: "Completed",
            value: metrics?.queue?.total_delivered ?? "–",
            sub: "Orders delivered",
            color: "var(--green)",
            icon: "✅",
            osNote: "Process Terminated",
        },
        {
            label: "Uptime",
            value: metrics ? formatUptime(metrics.uptime_seconds) : "–",
            sub: "Engine running",
            color: "var(--yellow)",
            icon: "⏱️",
            osNote: "System Clock",
        },
    ];

    return (
        <div>
            <div className="dashboard-grid grid-4 mb-16">
                {cards.map((card) => (
                    <div
                        key={card.label}
                        className="metric-card"
                        style={{ "--card-accent-color": card.color }}
                    >
                        <div className="metric-label">{card.label}</div>
                        <div className="metric-value" style={{ color: card.color }}>
                            {card.icon} {card.value}
                        </div>
                        <div className="metric-sub">{card.sub}</div>
                        <div className="badge badge-gray" style={{ marginTop: 10, fontSize: 9 }}>
                            OS: {card.osNote}
                        </div>
                    </div>
                ))}
            </div>

            {/* Thread activity bar */}
            {metrics && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">
                            <span className="card-icon">🔬</span>
                            Concurrency Monitor
                        </div>
                        <span className="badge badge-blue">
                            {metrics.threads.active}/{metrics.threads.max_concurrent} threads
                        </span>
                    </div>
                    <div className="card-body">
                        <div className="metric-label" style={{ marginBottom: 10 }}>
                            Thread Slots (max 5 concurrent — simulates CPU cores)
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            {Array.from({ length: metrics.threads.max_concurrent }).map((_, i) => (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                                    <div
                                        style={{
                                            width: "100%",
                                            height: 64,
                                            borderRadius: "var(--radius-sm)",
                                            background: "var(--bg-base)",
                                            border: "1px solid var(--border)",
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                position: "absolute",
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: i < metrics.threads.active ? "100%" : "0%",
                                                background: "var(--accent)",
                                                transition: "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                                boxShadow: i < metrics.threads.active ? "0 -4px 12px var(--accent-glow)" : "none",
                                            }}
                                        />
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Core {i + 1}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                            <span className="text-xs text-muted" style={{ fontWeight: 500 }}>
                                Total enqueued: <span style={{ color: "var(--text-primary)" }}>{metrics.queue.total_enqueued}</span>
                            </span>
                            <span className="text-xs text-muted" style={{ fontWeight: 500 }}>
                                Threads completed: <span style={{ color: "var(--text-primary)" }}>{metrics.threads.completed}</span>
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* System Throughput History */}
            {history.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header">
                        <div className="card-title">
                            <span className="card-icon">📈</span>
                            System Throughput History
                        </div>
                        <span className="badge badge-gray" style={{ fontSize: 9 }}>Last 20 ticks</span>
                    </div>
                    <div className="card-body">
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60, marginTop: 8 }}>
                            {history.map((h, i) => {
                                // Max height is 100%, based on an arbitrary max queue size of say, 10 for visual scale
                                const qScale = Math.min(100, (h.queue / 10) * 100);
                                const tScale = Math.min(100, (h.active / 5) * 100);

                                return (
                                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2, height: "100%" }}>
                                        {/* Threads Active (CPU Load) */}
                                        <div style={{
                                            width: "100%", height: `${tScale}%`, minHeight: h.active > 0 ? 4 : 0,
                                            background: "var(--purple)", opacity: 0.8, borderRadius: "2px 2px 0 0",
                                            transition: "height 0.3s ease"
                                        }} title={`CPU Load: ${h.active} threads`} />
                                        {/* Queue Size (Pending) */}
                                        <div style={{
                                            width: "100%", height: `${qScale}%`, minHeight: h.queue > 0 ? 4 : 0,
                                            background: "var(--accent)", opacity: 0.8, borderRadius: "0 0 2px 2px",
                                            transition: "height 0.3s ease"
                                        }} title={`Ready Queue: ${h.queue} pending`} />
                                    </div>
                                )
                            })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, background: "var(--purple)", borderRadius: "2px" }} /> CPU Load (Threads)
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, background: "var(--accent)", borderRadius: "2px" }} /> Ready Queue (Pending)
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
