/**
 * QueueMonitor.jsx — Live Order Queue Visualization
 *
 * OS Concept: Ready Queue — shows pending orders sorted by priority.
 * When empty → all orders are being processed (in CPU burst).
 */

const PRIORITY_COLOR = {
    1: { color: "var(--purple)", label: "VIP", fill: "var(--purple)" },
    2: { color: "var(--yellow)", label: "Express", fill: "var(--yellow)" },
    3: { color: "var(--accent)", label: "Normal", fill: "var(--accent)" },
};

const STATUS_COLOR = {
    Confirmed: "badge-blue",
    Preparing: "badge-yellow",
    "Out for Delivery": "badge-orange",
    Delivered: "badge-green",
};

export default function QueueMonitor({ orders }) {
    // Show orders that are not yet delivered (i.e., still "in system")
    const activeOrders = orders
        .filter((o) => o.status !== "Delivered")
        .sort((a, b) => a.priority - b.priority || a.created_at - b.created_at);

    const deliveredCount = orders.filter((o) => o.status === "Delivered").length;
    const pendingCount = orders.filter((o) => o.status === "Confirmed").length;

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <span className="card-icon">📋</span>
                    Order Queue
                    <span
                        style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            fontWeight: 500,
                        }}
                    >
                        — Priority Ready Queue
                    </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <span className="badge badge-blue">{pendingCount} pending</span>
                    <span className="badge badge-green">{deliveredCount} delivered</span>
                </div>
            </div>
            <div className="card-body">
                {activeOrders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🏁</div>
                        <div className="empty-title">Queue Empty</div>
                        <div className="empty-desc">
                            {orders.length === 0
                                ? "No orders yet — place one to start the simulation!"
                                : "All orders processed! Great throughput."}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {activeOrders.map((order, idx) => {
                            const pInfo = PRIORITY_COLOR[order.priority] || PRIORITY_COLOR[3];
                            const barWidth = Math.max(15, 100 - idx * 18);
                            return (
                                <div key={order.order_id} style={{
                                    display: "flex", alignItems: "center", gap: 16,
                                    padding: "16px",
                                    borderRadius: "var(--radius-sm)",
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border)",
                                    boxShadow: "var(--shadow-sm)",
                                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "var(--shadow-md)";
                                        e.currentTarget.style.borderColor = pInfo.color;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "none";
                                        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                                        e.currentTarget.style.borderColor = "var(--border)";
                                    }}
                                >
                                    <div style={{
                                        width: 28, height: 28, borderRadius: "50%",
                                        background: "var(--bg-base)", display: "flex",
                                        alignItems: "center", justifyContent: "center",
                                        fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
                                        border: "1px solid var(--border)"
                                    }}>
                                        {idx + 1}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: "50%",
                                                background: pInfo.color,
                                                boxShadow: `0 0 8px ${pInfo.color}`
                                            }} />
                                            <div style={{
                                                fontSize: 14, fontWeight: 600, color: "var(--text-primary)",
                                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                            }}>
                                                {order.customer_name}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                                                ID: {order.order_id.slice(0, 8)}…
                                            </span>
                                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>•</span>
                                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                                                {order.items?.length || 0} items
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                        <span className={`badge badge-${pInfo.label === "VIP" ? "purple" : pInfo.label === "Express" ? "yellow" : "blue"}`}>
                                            {pInfo.label} Priority
                                        </span>
                                        <span className={`badge ${STATUS_COLOR[order.status] || "badge-gray"}`} style={{ opacity: 0.85 }}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
