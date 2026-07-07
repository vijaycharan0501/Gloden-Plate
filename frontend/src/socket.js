import { io } from 'socket.io-client';

const URL = 'https://gloden-plate.onrender.com';

export const socket = io(URL, {
  autoConnect: true,
  withCredentials: true
});
