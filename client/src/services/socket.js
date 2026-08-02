import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://carerouteai.onrender.com';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

export const joinRoom = (roomName) => {
  if (socket && socket.connected) {
    socket.emit('join:room', roomName);
  }
};
