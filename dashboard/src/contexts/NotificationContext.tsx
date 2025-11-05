'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: 'report' | 'moderation' | 'spam' | 'user' | 'settings' | 'audit' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: unknown;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { subscribe, unsubscribe, connected } = useSocket();
  const { toast } = useToast();

  // Play notification sound
  const playSound = useCallback(() => {
    if (soundEnabled && typeof window !== 'undefined') {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Silently fail if audio playback is blocked
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  }, [soundEnabled]);

  // Add notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    playSound();

    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
    });
  }, [playSound, toast]);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  }, []);

  // Clear notification
  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!connected) return;

    // New report notification
    const handleNewReport = (data: any) => {
      addNotification({
        type: 'report',
        title: 'New Report',
        message: `${data.reportedAlias} was reported: ${data.reason}`,
        data,
      });
    };

    // Moderation action
    const handleModerationAction = (data: any) => {
      addNotification({
        type: 'moderation',
        title: 'Moderation Action',
        message: `${data.moderatorAlias} ${data.action}ed ${data.targetAlias}`,
        data,
      });
    };

    // User joined/left
    const handleUserJoined = (data: any) => {
      addNotification({
        type: 'user',
        title: 'User Joined',
        message: `${data.alias} joined the lobby`,
        data,
      });
    };

    const handleUserLeft = (data: any) => {
      addNotification({
        type: 'user',
        title: 'User Left',
        message: `${data.alias} left the lobby`,
        data,
      });
    };

    // Spam alert
    const handleSpamAlert = (data: any) => {
      addNotification({
        type: 'spam',
        title: 'Spam Detected',
        message: `${data.alias} triggered ${data.violationType} spam filter`,
        data,
      });
    };

    // Settings changed
    const handleSettingsChanged = (data: any) => {
      addNotification({
        type: 'settings',
        title: 'Settings Updated',
        message: `${data.setting} was modified`,
        data,
      });
    };

    // Audit log entry
    const handleAuditEntry = (data: any) => {
      // Only show critical audit entries
      if (data.severity === 'critical' || data.severity === 'high') {
        addNotification({
          type: 'audit',
          title: 'Security Alert',
          message: data.message || 'New critical action logged',
          data,
        });
      }
    };

    // Subscribe to events
    subscribe('report:new', handleNewReport);
    subscribe('action:moderation', handleModerationAction);
    subscribe('user:joined', handleUserJoined);
    subscribe('user:left', handleUserLeft);
    subscribe('spam:alert', handleSpamAlert);
    subscribe('settings:changed', handleSettingsChanged);
    subscribe('audit:new', handleAuditEntry);

    return () => {
      unsubscribe('report:new', handleNewReport);
      unsubscribe('action:moderation', handleModerationAction);
      unsubscribe('user:joined', handleUserJoined);
      unsubscribe('user:left', handleUserLeft);
      unsubscribe('spam:alert', handleSpamAlert);
      unsubscribe('settings:changed', handleSettingsChanged);
      unsubscribe('audit:new', handleAuditEntry);
    };
  }, [connected, subscribe, unsubscribe, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        soundEnabled,
        setSoundEnabled,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
