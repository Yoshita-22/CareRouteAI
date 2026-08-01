import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export const joinRoom = (roomName) => {
  if (socket && socket.connected) {
    socket.emit('join:room', roomName);
  }
};
