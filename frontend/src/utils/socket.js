import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  socket = io('/', {
    path: '/socket.io',
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
