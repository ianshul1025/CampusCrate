import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@clerk/clerk-react";
import { useDbAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

export const SocketProvider = ({ children }) => {
  const { isSignedIn } = useAuth();
  const { dbUser } = useDbAuth();

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  // typingUsers: Map<itemId, Set<userId>>
  const [typingUsers, setTypingUsers] = useState(new Map());

  // Refs for debouncing typing emit
  const typingTimerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isSignedIn) {
      // Disconnect cleanly
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Map());
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // ── Connection events ────────────────────────────────────────────
    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setIsConnected(true);
      if (dbUser?._id) {
        newSocket.emit("join_user", dbUser._id);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
    });

    // ── Presence events ──────────────────────────────────────────────
    newSocket.on("user_online", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });

    newSocket.on("user_offline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // ── Typing events ────────────────────────────────────────────────
    newSocket.on("typing_start", ({ conversationId, userId }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const roomTypers = new Set(next.get(conversationId) || []);
        roomTypers.add(userId);
        next.set(conversationId, roomTypers);
        return next;
      });
    });

    newSocket.on("typing_stop", ({ conversationId, userId }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        const roomTypers = new Set(next.get(conversationId) || []);
        roomTypers.delete(userId);
        if (roomTypers.size === 0) {
          next.delete(conversationId);
        } else {
          next.set(conversationId, roomTypers);
        }
        return next;
      });
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isSignedIn]);

  // Join user's private room once both socket and dbUser are ready
  useEffect(() => {
    if (socket && isConnected && dbUser?._id) {
      socket.emit("join_user", dbUser._id);
    }
  }, [socket, isConnected, dbUser?._id]);

  /**
   * Emit typing events with automatic debounce.
   * Call this on every keypress in a chat input.
   */
  const emitTyping = useCallback(
    (conversationId, receiverId) => {
      if (!socket || !dbUser?._id || !conversationId || !receiverId) return;

      // Emit typing_start (server will auto-timeout at 3s if stop not sent)
      socket.emit("typing_start", { conversationId, userId: dbUser._id, receiverId });

      // Client-side debounce: emit typing_stop after 1.5s of inactivity
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socket.emit("typing_stop", { conversationId, userId: dbUser._id, receiverId });
      }, 1500);
    },
    [socket, dbUser?._id]
  );

  /**
   * Explicitly stop typing (called on blur or send)
   */
  const stopTyping = useCallback(
    (conversationId, receiverId) => {
      if (!socket || !dbUser?._id || !conversationId || !receiverId) return;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      socket.emit("typing_stop", { conversationId, userId: dbUser._id, receiverId });
    },
    [socket, dbUser?._id]
  );

  useEffect(() => {
    if (socket && isConnected && dbUser?._id) {
      console.log("Emitting join_user for:", dbUser._id);
      socket.emit("join_user", dbUser._id);
    }
  }, [socket, isConnected, dbUser?._id]);

  const value = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    emitTyping,
    stopTyping,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
