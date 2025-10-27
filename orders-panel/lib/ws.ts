let socket: WebSocket | null = null;

export function buildSocket(url = "ws://localhost:3001/ws/orders") {
  if (typeof window === "undefined") {
    throw new Error("WebSocket solo válido en el cliente");
  }
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    return socket;
  }
  socket = new WebSocket(url);
  return socket;
}
