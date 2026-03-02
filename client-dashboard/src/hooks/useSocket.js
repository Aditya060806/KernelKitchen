/**
 * useSocket.js — Custom React Hook for Socket.IO
 *
 * Manages the WebSocket connection to the Gateway Server,
 * handles reconnection, and provides event subscription helpers.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function useSocket() {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [engineStatus, setEngineStatus] = useState("disconnected");
    const listenersRef = useRef({});

    useEffect(() => {
        const socket = io(API_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            setEngineStatus("connected");
        });

        socket.on("disconnect", () => {
            setConnected(false);
        });

        socket.on("engine_status", (data) => {
            setEngineStatus(data.status);
        });

        // Attach all registered listeners
        Object.entries(listenersRef.current).forEach(([event, handlers]) => {
            handlers.forEach((handler) => socket.on(event, handler));
        });

        return () => socket.disconnect();
    }, []);

    const on = useCallback((event, handler) => {
        if (!listenersRef.current[event]) listenersRef.current[event] = [];
        listenersRef.current[event].push(handler);

        if (socketRef.current) {
            socketRef.current.on(event, handler);
        }

        return () => {
            if (socketRef.current) socketRef.current.off(event, handler);
            listenersRef.current[event] = (listenersRef.current[event] || []).filter((h) => h !== handler);
        };
    }, []);

    return { socket: socketRef.current, connected, engineStatus, on };
}
