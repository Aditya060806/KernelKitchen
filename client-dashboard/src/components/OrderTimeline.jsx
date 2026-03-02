/**
 * OrderTimeline.jsx — Per-Order Status Timeline
 *
 * OS Concept: Process State Diagram
 *   Confirmed → Preparing → Out for Delivery → Delivered
 *   = NEW → READY → RUNNING → TERMINATED
 */

const STEPS = [
    { label: "Confirmed", icon: "📥", osLabel: "NEW" },
    { label: "Preparing", icon: "🍳", osLabel: "RUNNING" },
    { label: "Out for Delivery", icon: "🚴", osLabel: "WAITING" },
    { label: "Delivered", icon: "✅", osLabel: "TERMINATED" },
];

const PRIORITY_BADGE = {
    VIP: "badge-purple",
    Express: "badge-yellow",
    Normal: "badge-blue",
};

function getStepIndex(status) {
    return STEPS.findIndex((s) => s.label === status);
}

function TimestampAgo({ ts }) {
    const seconds = Math.floor((Date.now() / 1000) - ts);
    if (seconds < 60) return <>{seconds}s ago</>;
    const m = Math.floor(seconds / 60);
    return <>{m}m ago</>;
}

export default function OrderTimeline({ orders }) {
    const allOrders = [...orders].sort((a, b) => b.created_at - a.created_at);

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <span className="card-icon">📡</span>
                    Order Lifecycle
                    <span
                        style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            fontWeight: 500,
                        }}
                    >
                        — Process State Transitions
                    </span>
                </div>
                <span className="badge badge-blue">{allOrders.length} orders</span>
            </div>
            <div className="card-body">
                {allOrders.length === 0 ? (
                    <div style={{
                        padding: "60px 20px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "var(--bg-base)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px dashed var(--border)",
                        textAlign: "center"
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: "50%",
                            background: "var(--bg-card)", border: "1px solid var(--border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 28, marginBottom: 16, boxShadow: "var(--shadow-md)"
                        }}>
                            🚀
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                            System Ready For Orders
                        </h3>
                        <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 300, lineHeight: 1.5 }}>
                            The Order Confirmed simulation engine is standing by. Place an order to see its OS process lifecycle tracked here.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {allOrders.map((order) => {
                            const currentStep = getStepIndex(order.status);
                            const isDelivered = order.status === "Delivered";

                            return (
                                <div
                                    key={order.order_id}
                                    style={{
                                        padding: "16px",
                                        background: "var(--bg-base)",
                                        borderRadius: "var(--radius-sm)",
                                        border: `1px solid ${isDelivered ? "hsla(145,70%,50%,0.2)" : "var(--border)"}`,
                                        transition: "border-color 0.3s",
                                    }}
                                >
                                    {/* Order Header */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 14,
                                            flexWrap: "wrap",
                                            gap: 8,
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                                                    {order.customer_name}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: "var(--text-muted)",
                                                        fontWeight: 500,
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    {order.order_id.slice(0, 18)}…
                                                    <span style={{ marginLeft: 8 }}>
                                                        <TimestampAgo ts={order.created_at} />
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <span className={`badge ${PRIORITY_BADGE[order.order_type] || "badge-blue"}`}>
                                                {order.order_type}
                                            </span>
                                            {order.thread_id && (
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        color: "var(--text-secondary)",
                                                        padding: "4px 8px",
                                                        background: "var(--bg-glass)",
                                                        borderRadius: "var(--radius-sm)",
                                                    }}
                                                >
                                                    TID:{String(order.thread_id).slice(-6)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Timeline Steps */}
                                    <div className="timeline">
                                        {STEPS.map((step, idx) => {
                                            const isDone = idx < currentStep || isDelivered;
                                            const isActive = idx === currentStep && !isDelivered;

                                            return (
                                                <div key={step.label} className="timeline-step">
                                                    <div
                                                        className={`timeline-dot ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
                                                        title={`OS State: ${step.osLabel}`}
                                                    >
                                                        {step.icon}
                                                    </div>
                                                    <span
                                                        className={`timeline-label ${isDone ? "done" : ""} ${isActive ? "active" : ""}`}
                                                    >
                                                        {step.label}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: 10,
                                                            color: "var(--text-muted)",
                                                            fontWeight: 600,
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        {step.osLabel}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Items */}
                                    {order.items?.length > 0 && (
                                        <div
                                            style={{
                                                marginTop: 10,
                                                fontSize: 11,
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {order.items.join(" · ")}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
