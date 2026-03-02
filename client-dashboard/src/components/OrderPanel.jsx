/**
 * OrderPanel.jsx — Place Order UI
 *
 * Allows users to submit new food orders with priority selection.
 * Maps directly to the OS concept of submitting a process to the scheduler.
 */

import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const PRIORITY_INFO = {
    Normal: { color: "var(--accent)", icon: "🔵", desc: "Standard process priority" },
    Express: { color: "var(--yellow)", icon: "🟡", desc: "Elevated scheduling priority" },
    VIP: { color: "var(--purple)", icon: "🟣", desc: "Real-time process — highest priority" },
};

const MENU_ITEMS = ["🍔 Burger", "🍕 Pizza", "🌮 Tacos", "🍜 Ramen", "🥗 Salad", "🍟 Fries", "🧃 Juice"];

export default function OrderPanel({ onOrderPlaced }) {
    const [form, setForm] = useState({
        customer_name: "",
        order_type: "Normal",
        items: [],
    });
    const [loading, setLoading] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [error, setError] = useState(null);

    const toggleItem = (item) => {
        setForm((f) => ({
            ...f,
            items: f.items.includes(item)
                ? f.items.filter((i) => i !== item)
                : [...f.items, item],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.customer_name.trim()) return setError("Customer name is required.");
        if (form.items.length === 0) return setError("Select at least one item.");

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/order`, form);
            setLastOrder(res.data.order);
            onOrderPlaced?.(res.data.order);
            setForm({ customer_name: "", order_type: "Normal", items: [] });
        } catch (err) {
            setError(err.response?.data?.error || "Failed to place order. Is the server running?");
        } finally {
            setLoading(false);
        }
    };

    const priority = PRIORITY_INFO[form.order_type];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Order Form */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <span className="card-icon">🛒</span>
                        Place New Order
                    </div>
                    <span className="badge badge-blue">POST /api/order</span>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {/* Customer Name */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="customer_name">
                                Customer Name
                            </label>
                            <input
                                id="customer_name"
                                className="form-input"
                                type="text"
                                placeholder="e.g. Aditya Pandey"
                                value={form.customer_name}
                                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                                maxLength={40}
                            />
                        </div>

                        {/* Priority Type */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="order_type">
                                Order Priority <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(OS Scheduling Level)</span>
                            </label>
                            <select
                                id="order_type"
                                className="form-select"
                                value={form.order_type}
                                onChange={(e) => setForm((f) => ({ ...f, order_type: e.target.value }))}
                            >
                                <option value="Normal">Normal — Standard Priority</option>
                                <option value="Express">Express — High Priority</option>
                                <option value="VIP">VIP — Real-Time Priority</option>
                            </select>
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 16 }}>{priority.icon}</span>
                                <span style={{ fontSize: 13, color: priority.color, fontWeight: 500 }}>
                                    {priority.desc}
                                </span>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="form-group">
                            <label className="form-label">Select Items</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {MENU_ITEMS.map((item) => {
                                    const selected = form.items.includes(item);
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => toggleItem(item)}
                                            style={{
                                                padding: "6px 12px",
                                                borderRadius: "var(--radius-sm)",
                                                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                                                background: selected ? "var(--accent-dim)" : "transparent",
                                                color: selected ? "var(--accent)" : "var(--text-secondary)",
                                                fontSize: 12,
                                                fontWeight: 500,
                                                cursor: "pointer",
                                                fontFamily: "var(--font-sans)",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                style={{
                                    padding: "10px 14px",
                                    background: "var(--red-dim)",
                                    border: "1px solid hsla(0,80%,62%,0.25)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: 12,
                                    color: "var(--red)",
                                    marginBottom: 14,
                                }}
                            >
                                ⚠️ {error}
                            </div>
                        )}

                        <button
                            id="submit-order-btn"
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? "⏳ Submitting..." : "🚀 Submit Order → Scheduler"}
                        </button>
                    </form>
                </div>
            </div>

            {/* Last Placed Order */}
            {lastOrder && (
                <div
                    className="card fade-in"
                    style={{ border: "1px solid var(--green)", boxShadow: "0 4px 12px var(--green-dim)" }}
                >
                    <div className="card-header">
                        <div className="card-title">
                            <span className="card-icon">✅</span>
                            Order Confirmed
                        </div>
                        <span className="badge badge-green">Enqueued</span>
                    </div>
                    <div className="card-body">
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div className="flex items-center gap-8">
                                <span className="text-xs text-muted">Order ID</span>
                                <span
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                    }}
                                >
                                    {lastOrder.order_id.slice(0, 18)}…
                                </span>
                            </div>
                            <div className="flex items-center gap-8">
                                <span className="text-xs text-muted">Customer</span>
                                <span className="text-sm">{lastOrder.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <span className="text-xs text-muted">Priority</span>
                                <span
                                    className={`badge badge-${lastOrder.order_type === "VIP" ? "purple" : lastOrder.order_type === "Express" ? "yellow" : "blue"
                                        }`}
                                >
                                    {lastOrder.order_type}
                                </span>
                            </div>
                            <div className="flex items-center gap-8">
                                <span className="text-xs text-muted">Items</span>
                                <span className="text-xs text-muted">{lastOrder.items.join(", ")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
