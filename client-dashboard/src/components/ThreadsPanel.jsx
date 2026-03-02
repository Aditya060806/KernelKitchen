/**
 * ThreadsPanel.jsx — Active Thread Monitor
 *
 * OS Concept: Thread/Process lifecycle visualization.
 * Each active thread = one order being "processed" (CPU burst).
 */

import { useState, useEffect } from "react";

export default function ThreadsPanel({ threads, socketOn }) {
    const [completedThreads, setCompletedThreads] = useState([]);
    const [animate, setAnimate] = useState({});

    // Listen for thread_done events
    useEffect(() => {
        if (!socketOn) return;
        const off = socketOn("thread_done", (data) => {
            setCompletedThreads((prev) => [
                { ...data, finishedAt: Date.now() },
                ...prev.slice(0, 9), // Keep last 10
            ]);
        });
        return off;
    }, [socketOn]);

    // Animate new threads
    useEffect(() => {
        threads.forEach((t) => {
            if (!animate[t.order_id]) {
                setAnimate((prev) => ({ ...prev, [t.order_id]: true }));
            }
        });
    }, [threads]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Active Threads */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <span className="card-icon">🧵</span>
                        Active Threads
                        <span
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "var(--text-muted)",
                                fontWeight: 400,
                            }}
                        >
                            — CPU Burst
                        </span>
                    </div>
                    <span className="badge badge-purple">{threads.length} running</span>
                </div>
                <div className="card-body">
                    {threads.length === 0 ? (
                        <div style={{
                            padding: "48px 20px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            background: "var(--bg-card)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px dashed var(--border)",
                            textAlign: "center"
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: "50%",
                                background: "var(--bg-base)", border: "1px solid var(--border)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 24, marginBottom: 16, boxShadow: "var(--shadow-sm)"
                            }}>
                                💤
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                                No Active Threads
                            </h3>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 220, lineHeight: 1.5 }}>
                                The CPU is currently idle. Threads will spawn here when orders enter the processing pipeline.
                            </p>
                        </div>
                    ) : (
                        <div className="thread-list">
                            {threads.map((thread) => (
                                <div key={thread.order_id} className="thread-item">
                                    <div className="thread-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 14 }}>🔄</span>
                                            <span className="thread-name">{thread.thread_name}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <span className="badge badge-purple">RUNNING</span>
                                        </div>
                                    </div>

                                    {thread.thread_id && (
                                        <div
                                            style={{
                                                fontFamily: "var(--font-mono)",
                                                fontSize: 10,
                                                color: "var(--text-muted)",
                                                display: "flex",
                                                gap: 16,
                                            }}
                                        >
                                            <span>TID: {String(thread.thread_id).slice(-8)}</span>
                                            <span>ORDER: {thread.order_id?.slice(0, 12)}…</span>
                                        </div>
                                    )}

                                    <div className="thread-progress">
                                        <div className="thread-progress-bar" />
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 6,
                                            alignItems: "center",
                                            fontSize: 10,
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                background: "var(--green)",
                                                animation: "pulse-dot 1.5s infinite",
                                                display: "inline-block",
                                            }}
                                        />
                                        Thread alive — simulating delivery pipeline
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Completed Threads Log */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <span className="card-icon">💀</span>
                        Terminated Threads
                        <span
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 10,
                                color: "var(--text-muted)",
                                fontWeight: 400,
                            }}
                        >
                            — Process Exit / Reaping
                        </span>
                    </div>
                    <span className="badge badge-green">{completedThreads.length} done</span>
                </div>
                <div className="card-body">
                    {completedThreads.length === 0 ? (
                        <div style={{
                            padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            background: "var(--bg-base)", borderRadius: "var(--radius-sm)", border: "1px dashed hsla(145, 70%, 50%, 0.2)"
                        }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: "50%", background: "var(--bg-card)", border: "1px solid var(--border)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 12
                            }}>
                                📦
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                                No Terminated Threads
                            </div>
                        </div>
                    ) : (
                        <div
                            className="log-box"
                            style={{ height: 160 }}
                            ref={(el) => el && (el.scrollTop = 0)}
                        >
                            {completedThreads.map((t, i) => (
                                <div key={i} className="log-line success">
                                    <span className="ts">
                                        {new Date(t.finishedAt).toLocaleTimeString()}
                                    </span>
                                    <span className="tag">[TERMINATED]</span>
                                    <span style={{ color: "var(--green)" }}>{t.thread_name}</span>
                                    <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>
                                        — {t.total_time}s total
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
