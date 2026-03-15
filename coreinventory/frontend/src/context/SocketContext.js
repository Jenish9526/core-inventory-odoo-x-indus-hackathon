import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [stockEvents, setStockEvents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('ci_token');
    if (!token) return;

    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('stock_updated', (data) => {
      setStockEvents(prev => [{ ...data, ts: Date.now() }, ...prev.slice(0, 19)]);
      toast.success(`Stock updated — ${data.ref || data.type}`, { icon: '📦' });
    });

    socket.on('low_stock_alert', (data) => {
      toast.error(`⚠️ ${data.count} product(s) running low on stock!`, { duration: 6000 });
    });

    return () => socket.disconnect();
  }, []);

  const emit = (event, data) => socketRef.current?.emit(event, data);

  return (
    <SocketContext.Provider value={{ connected, stockEvents, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
