import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        // Join a private room for the user (for global notifications/unread counts)
        socket.on("join_user", (userId) => {
            if (userId) {
                socket.join(`user:${userId}`);
                console.log(`User ${socket.id} joined private room: user:${userId}`);
            }
        });

        // Join a specific item's chat room
        socket.on("join_chat", (itemId) => {
            if (itemId) {
                socket.join(`chat:${itemId}`);
                console.log(`User ${socket.id} joined chat room: chat:${itemId}`);
            }
        });

        // Leave a specific item's chat room (optional, handled automatically on disconnect)
        socket.on("leave_chat", (itemId) => {
            if (itemId) {
                socket.leave(`chat:${itemId}`);
                console.log(`User ${socket.id} left chat room: chat:${itemId}`);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Helper to emit message to a specific room
export const emitToRoom = (roomId, event, data) => {
    if (io) {
        io.to(roomId).emit(event, data);
    }
};
