'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

export interface Notification {
  id: string;
  type: 'report' | 'moderation' | 'spam' | 'user_joined' | 'user_left' | 'user_status' | 'settings' | 'audit' | 'bot_log';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: unknown;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  desktopPushEnabled: boolean;
  setDesktopPushEnabled: (enabled: boolean) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [desktopPushEnabled, setDesktopPushEnabledState] = useState(false);
  const { subscribe, unsubscribe, connected } = useSocket();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get<{ notifications: any[]; unreadCount: number; pagination: any }>('/notifications');

      if (response.success && response.data) {
        const loadedNotifications = response.data.notifications.map((n: any) => ({
          ...n,
          id: n._id, // Map MongoDB _id to id
          timestamp: new Date(n.timestamp),
        }));
        setNotifications(loadedNotifications);
      }
    } catch (error: any) {
      // Silently ignore 401 errors (not authenticated)
      if (error.response?.status !== 401) {
        console.error('Failed to load notifications:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await apiClient.get<{ preferences: any }>('/notifications/preferences');

      if (response.success && response.data) {
        setSoundEnabledState(response.data.preferences.soundEnabled);
        setDesktopPushEnabledState(response.data.preferences.desktopPushEnabled);
      }
    } catch (error: any) {
      // Silently ignore 401 errors (not authenticated)
      if (error.response?.status !== 401) {
        console.error('Failed to load notification preferences:', error);
      }
    }
  }, [isAuthenticated]);

  // Initial load and auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      loadPreferences();
    } else {
      // Clear notifications when logged out
      setNotifications([]);
      setLoading(false);
    }
  }, [isAuthenticated, loadNotifications, loadPreferences]);

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

  // Show desktop notification
  const showDesktopNotification = useCallback((title: string, message: string) => {
    if (!desktopPushEnabled || typeof window === 'undefined') return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/logo.png',
          tag: 'lobby-notification',
        });
      } catch (error) {
        console.error('Failed to show desktop notification:', error);
      }
    }
  }, [desktopPushEnabled]);

  // Add notification (local only, used for WebSocket events)
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
    playSound();
    showDesktopNotification(notification.title, notification.message);

    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
    });
  }, [playSound, showDesktopNotification, toast]);

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await apiClient.patch(`/notifications/${id}/read`, {});

      if (response.success) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await apiClient.patch('/notifications/read-all', {});

      if (response.success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Clear notification
  const clearNotification = useCallback(async (id: string) => {
    try {
      const response = await apiClient.delete(`/notifications/${id}`);

      if (response.success) {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      }
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  }, []);

  // Clear all
  const clearAll = useCallback(async () => {
    try {
      const response = await apiClient.delete('/notifications/clear-all');

      if (response.success) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  }, []);

  // Update sound preference
  const setSoundEnabled = useCallback(async (enabled: boolean) => {
    try {
      setSoundEnabledState(enabled);

      await apiClient.patch('/notifications/preferences', { soundEnabled: enabled });
    } catch (error) {
      console.error('Failed to update sound preference:', error);
    }
  }, []);

  // Update desktop push preference
  const setDesktopPushEnabled = useCallback(async (enabled: boolean) => {
    try {
      // Request permission if enabling
      if (enabled && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Desktop notification permission denied');
          return;
        }
      }

      setDesktopPushEnabledState(enabled);

      await apiClient.patch('/notifications/preferences', { desktopPushEnabled: enabled });
    } catch (error) {
      console.error('Failed to update desktop push preference:', error);
    }
  }, []);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!connected) return;

    // Handle new notification event from server
    const handleNewNotification = (data: any) => {
      const newNotification: Notification = {
        id: data.id,
        type: data.type,
        title: data.title,
        message: data.message,
        timestamp: new Date(data.timestamp),
        read: false,
        data: data.data,
      };

      setNotifications((prev) => [newNotification, ...prev]);
      playSound();
      showDesktopNotification(data.title, data.message);

      // Show toast notification
      toast({
        title: data.title,
        description: data.message,
        duration: 5000,
      });
    };

    // Legacy event handlers for role-based room broadcasts
    const handleNewReport = (data: any) => {
      addNotification({
        type: 'report',
        title: 'New Report',
        message: `${data.reportedAlias} was reported: ${data.reason}`,
        data,
      });
    };

    const handleModerationAction = (data: any) => {
      addNotification({
        type: 'moderation',
        title: 'Moderation Action',
        message: `${data.moderatorAlias} ${data.action}ed ${data.targetAlias}`,
        data,
      });
    };

    const handleUserJoined = (data: any) => {
      addNotification({
        type: 'user_joined',
        title: 'User Joined',
        message: `${data.alias} joined the lobby`,
        data,
      });
    };

    const handleUserLeft = (data: any) => {
      addNotification({
        type: 'user_left',
        title: 'User Left',
        message: `${data.alias} left the lobby`,
        data,
      });
    };

    const handleSpamAlert = (data: any) => {
      addNotification({
        type: 'spam',
        title: 'Spam Detected',
        message: `${data.alias} triggered ${data.violationType} spam filter`,
        data,
      });
    };

    const handleSettingsChanged = (data: any) => {
      addNotification({
        type: 'settings',
        title: 'Settings Updated',
        message: `${data.setting} was modified`,
        data,
      });
    };

    const handleAuditEntry = (data: any) => {
      if (data.severity === 'critical' || data.severity === 'high') {
        addNotification({
          type: 'audit',
          title: 'Security Alert',
          message: data.message || 'New critical action logged',
          data,
        });
      }
    };

    // Subscribe to new notification event (persisted notifications)
    subscribe('notification:new', handleNewNotification);

    // Subscribe to legacy events (for real-time role-based broadcasts)
    subscribe('report:new', handleNewReport);
    subscribe('action:moderation', handleModerationAction);
    subscribe('user:joined', handleUserJoined);
    subscribe('user:left', handleUserLeft);
    subscribe('spam:alert', handleSpamAlert);
    subscribe('settings:changed', handleSettingsChanged);
    subscribe('audit:new', handleAuditEntry);

    return () => {
      unsubscribe('notification:new', handleNewNotification);
      unsubscribe('report:new', handleNewReport);
      unsubscribe('action:moderation', handleModerationAction);
      unsubscribe('user:joined', handleUserJoined);
      unsubscribe('user:left', handleUserLeft);
      unsubscribe('spam:alert', handleSpamAlert);
      unsubscribe('settings:changed', handleSettingsChanged);
      unsubscribe('audit:new', handleAuditEntry);
    };
  }, [connected, subscribe, unsubscribe, addNotification, playSound, showDesktopNotification, toast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        soundEnabled,
        setSoundEnabled,
        desktopPushEnabled,
        setDesktopPushEnabled,
        refreshNotifications: loadNotifications,
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
