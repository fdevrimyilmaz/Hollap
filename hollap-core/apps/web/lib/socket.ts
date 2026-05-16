import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { getTokens } from "./auth-storage";

let socketRef: Socket | null = null;

export function getSocket() {
  if (socketRef) {
    return socketRef;
  }

  const accessToken = getTokens()?.accessToken;
  socketRef = io(SOCKET_URL, {
    autoConnect: true,
    transports: ["websocket"],
    auth: {
      token: accessToken,
    },
  });

  return socketRef;
}

export function disconnectSocket() {
  if (socketRef) {
    socketRef.disconnect();
    socketRef = null;
  }
}
