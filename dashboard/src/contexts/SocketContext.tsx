'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketClient } from '@/lib/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribe: (event: string, callback: (data: unknown) => void) => void;
  unsubscribe: (event: string, callback?: (data: unknown) => void) => void;
  emit: (event: string, data?: unknown) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const socketInstance = socketClient.connect(token);
        setSocket(socketInstance);

        socketInstance.on('connect', () => setConnected(true));
        socketInstance.on('disconnect', () => setConnected(false));
      }
    } else {
      socketClient.disconnect();
      setSocket(null);
      setConnected(false);
    }

    return () => {
      socketClient.disconnect();
    };
  }, [isAuthenticated]);

  const subscribe = (event: string, callback: (data: unknown) => void) => {
    socketClient.on(event, callback);
  };

  const unsubscribe = (event: string, callback?: (data: unknown) => void) => {
    socketClient.off(event, callback);
  };

  const emit = (event: string, data?: unknown) => {
    socketClient.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ socket, connected, subscribe, unsubscribe, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
