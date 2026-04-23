import { Server } from "socket.io";

let io;

// Track which sockets belong to which user
// userId → Set<socketId>
const userSocketMap = new Map();

// Track which users are online
// userId → true
const onlineUsers = new Set();

// Track typing state per chat room
// `${itemId}:${userId}` → timeout handle
const typingTimers = new Map();

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Register a socket for a given userId */
function registerSocket(userId, socketId) {
    if (!userSocketMap.has(userId)) {
        userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socketId);
    onlineUsers.add(userId);
}

/** Remove a socket. Returns true if the user is now fully offline. */
function unregisterSocket(userId, socketId) {
    const sockets = userSocketMap.get(userId);
    if (!sockets) return true;
    sockets.delete(socketId);
    if (sockets.size === 0) {
        userSocketMap.delete(userId);
        onlineUsers.delete(userId);
        return true; // user is now offline
    }
    return false;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true
        },
        // Performance: prefer WebSocket but allow polling fallback
        transports: ["websocket", "polling"],
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        let connectedUserId = null;

        // ── Presence: user joins their private room ──────────────────────────
        socket.on("join_user", (userId) => {
            if (!userId) return;
            connectedUserId = String(userId);
            socket.join(`user:${connectedUserId}`);
            registerSocket(connectedUserId, socket.id);
            console.log(`User ${connectedUserId} online (socket: ${socket.id})`);

            // Broadcast to everyone that this user is online
            socket.broadcast.emit("user_online", { userId: connectedUserId });
        });

        // ── Chat room membership ─────────────────────────────────────────────
        socket.on("join_chat", (conversationId) => {
            if (!conversationId) return;
            socket.join(`chat:${conversationId}`);
        });

        socket.on("leave_chat", (conversationId) => {
            if (!conversationId) return;
            socket.leave(`chat:${conversationId}`);
            // Clear any pending typing timer for this user in this room
            if (connectedUserId) {
                const key = `${conversationId}:${connectedUserId}`;
                const timer = typingTimers.get(key);
                if (timer) {
                    clearTimeout(timer);
                    typingTimers.delete(key);
                }
            }
        });

        // ── Typing indicators ────────────────────────────────────────────────
        socket.on("typing_start", ({ conversationId, userId, receiverId }) => {
            if (!conversationId || !userId || !receiverId) return;
            const key = `${conversationId}:${userId}`;

            // Emit ONLY to the specific receiver's private room
            emitToUser(receiverId, "typing_start", { conversationId, userId });

            // Auto-clear typing after 3 seconds of inactivity
            if (typingTimers.has(key)) {
                clearTimeout(typingTimers.get(key));
            }
            const timer = setTimeout(() => {
                emitToUser(receiverId, "typing_stop", { conversationId, userId });
                typingTimers.delete(key);
            }, 3000);
            typingTimers.set(key, timer);
        });

        socket.on("typing_stop", ({ conversationId, userId, receiverId }) => {
            if (!conversationId || !userId || !receiverId) return;
            const key = `${conversationId}:${userId}`;
            const timer = typingTimers.get(key);
            if (timer) {
                clearTimeout(timer);
                typingTimers.delete(key);
            }
            emitToUser(receiverId, "typing_stop", { conversationId, userId });
        });

        // ── Message Lifecycle ────────────────────────────────────────────────
        socket.on("send_message", async ({ itemId, message, receiverId, senderId }) => {
            if (!itemId || !message || !receiverId || !senderId) return;
            try {
                const Message = (await import("./models/message.model.js")).default;
                const Item = (await import("./models/item.model.js")).default;
                const { Conversation } = await import("./models/conversation.model.js");
                const User = (await import("./models/user.model.js")).default;

                // Find or create conversation
                let conversation = await Conversation.findOne({
                    item: itemId,
                    participants: { $all: [senderId, receiverId] }
                });

                if (!conversation) {
                    conversation = await Conversation.create({
                        item: itemId,
                        participants: [senderId, receiverId]
                    });
                }

                const newMessage = await Message.create({
                    sender: senderId,
                    receiver: receiverId,
                    item: itemId,
                    conversation: conversation._id,
                    message: message.trim(),
                    status: onlineUsers.has(String(receiverId)) ? "delivered" : "sent"
                });

                conversation.latestMessage = newMessage._id;
                await conversation.save();
                await newMessage.populate("sender", "firstName lastName avatar");

                const messagePayload = newMessage.toObject();

                // Emit back to sender
                emitToUser(senderId, "message_sent", { ...messagePayload, isMe: true });

                // Emit to receiver
                emitToUser(receiverId, "receive_message", { ...messagePayload, isMe: false });

            } catch (error) {
                console.error("Error in send_message socket handler:", error);
            }
        });

        socket.on("message_delivered", async ({ messageId, senderId }) => {
            if (!messageId || !senderId) return;
            try {
                const Message = (await import("./models/message.model.js")).default;
                const msg = await Message.findById(messageId);
                if (msg && msg.status === "sent") {
                    msg.status = "delivered";
                    await msg.save();
                    // Notify sender
                    emitToUser(senderId, "message_status", {
                        messageId,
                        conversationId: msg.conversation,
                        status: "delivered"
                    });
                }
            } catch (error) {
                console.error("Error in message_delivered:", error);
            }
        });

        socket.on("message_read", async ({ messageId, itemId, senderId }) => {
            if (!messageId || !senderId) return;
            try {
                const Message = (await import("./models/message.model.js")).default;
                const msg = await Message.findById(messageId);
                if (msg && (msg.status === "sent" || msg.status === "delivered")) {
                    msg.status = "read";
                    msg.read = true;
                    await msg.save();
                    // Notify sender
                    emitToUser(senderId, "message_status", {
                        messageId,
                        conversationId: msg.conversation,
                        status: "read"
                    });
                }
            } catch (error) {
                console.error("Error in message_read:", error);
            }
        });

        // ── Disconnect ───────────────────────────────────────────────────────
        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
            if (connectedUserId) {
                const isOffline = unregisterSocket(connectedUserId, socket.id);
                if (isOffline) {
                    console.log(`User ${connectedUserId} is now offline`);
                    io.emit("user_offline", { userId: connectedUserId });
                }
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
};

/** Emit an event to all sockets belonging to a specific user */
export const emitToUser = (userId, event, data) => {
    if (io && userId) {
        io.to(`user:${String(userId)}`).emit(event, data);
    }
};

/** Emit an event to a chat room */
export const emitToRoom = (roomId, event, data) => {
    if (io) {
        io.to(roomId).emit(event, data);
    }
};

/** Check if a user currently has any active socket connections */
export const isUserOnline = (userId) => {
    return onlineUsers.has(String(userId));
};

/** Get all currently online user IDs */
export const getOnlineUsers = () => {
    return Array.from(onlineUsers);
};
