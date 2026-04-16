import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@clerk/clerk-react";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    let newSocket;
    if (isSignedIn) {
      newSocket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      setSocket(newSocket);
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [isSignedIn]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
