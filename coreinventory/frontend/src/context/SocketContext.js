import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [stockEvents, setStockEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const addNotif = (notif) =>
    setNotifications(prev => [{ ...notif, id: Date.now() + Math.random(), ts: new Date(), read: false }, ...prev.slice(0, 49)]);

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
      const msg = `Stock updated — ${data.ref || data.type}`;
      toast.success(msg, { icon: '📦' });
      addNotif({ type: 'stock', icon: '📦', title: 'Stock Updated', message: msg });
    });

    socket.on('low_stock_alert', (data) => {
      const msg = `${data.count} product(s) running low on stock`;
      toast.error(`⚠️ ${msg}`, { duration: 6000 });
      addNotif({ type: 'warning', icon: '⚠️', title: 'Low Stock Alert', message: msg });
    });

    socket.on('activity:new', (data) => {
      addNotif({ type: 'activity', icon: '🔄', title: 'New Activity', message: data.message || data.type });
    });

    return () => socket.disconnect();
  }, []);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);
  const emit = (event, data) => socketRef.current?.emit(event, data);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SocketContext.Provider value={{ connected, stockEvents, notifications, unreadCount, markAllRead, clearAll, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
