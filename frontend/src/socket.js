import { io } from 'socket.io-client';

const hostname = window.location.hostname;
const URL = `http://${hostname}:5000`;

export const socket = io(URL, {
  autoConnect: true,
  withCredentials: true
});
