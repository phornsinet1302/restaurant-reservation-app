import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/app/config/apiConfig';

// ─── Shared socket singleton ───────────────────────────────────────────────
let sharedSocket: Socket | null = null;
let sharedSocketToken: string | null = null;

// ─── JWT helper ───────────────────────────────────────────────────────────
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────
export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string | null;
};

// ─── Hook ─────────────────────────────────────────────────────────────────
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const mountedRef = useRef(true);

  // ── Core fetch from REST API ─────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25000,
      });

      if (!mountedRef.current) return;

      const data: Notification[] = response.data ?? [];
      console.log(`📢 [useNotifications] Fetched ${data.length} notifications from DB`);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (error: any) {
      console.warn('⚠️ [useNotifications] fetchNotifications error:', error?.message ?? error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ── Mark one as read ────────────────────────────────────────────────
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.patch(
        `${API_CONFIG.BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('❌ [useNotifications] markAsRead error:', error?.message);
    }
  }, []);

  // ── Mark all as read ────────────────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.patch(
        `${API_CONFIG.BASE_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error: any) {
      console.error('❌ [useNotifications] markAllAsRead error:', error?.message);
    }
  }, []);

  // ── Delete one ──────────────────────────────────────────────────────
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.delete(
        `${API_CONFIG.BASE_URL}/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) => {
        const target = prev.find((n) => n.id === notificationId);
        if (target && !target.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (error: any) {
      console.error('❌ [useNotifications] deleteNotification error:', error?.message);
    }
  }, []);

  // ── WebSocket setup ─────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    let connectHandler: (() => void) | null = null;
    let notificationHandler: ((data: any) => void) | null = null;
    let disconnectHandler: (() => void) | null = null;
    let connectErrorHandler: ((error: any) => void) | null = null;
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;

    const setupWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        const decoded = decodeJwtPayload(token);
        const userId: string = decoded?.sub || decoded?.id || '';

        if (!userId) {
          console.warn('⚠️ [useNotifications] Cannot extract userId from token');
          return;
        }

        console.log(`🔌 [useNotifications] Setting up socket for user: ${userId}`);

        // Reuse or create shared socket
        if (!sharedSocket || sharedSocketToken !== token) {
          if (sharedSocket) sharedSocket.disconnect();
          sharedSocket = io(API_CONFIG.BASE_URL, {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 10,
            timeout: 10000,
          });
          sharedSocketToken = token;
        }

        const socket = sharedSocket;

        const joinRoom = () => {
          if (userId) {
            socket.emit('join_room', userId);
            console.log(`🚪 [useNotifications] join_room emitted: ${userId}`);
          }
        };

        // Join on connect (handles reconnects too)
        connectHandler = () => {
          console.log(`✅ [useNotifications] Socket connected: ${socket.id}`);
          joinRoom();
        };
        socket.on('connect', connectHandler);

        // Join immediately if already connected
        if (socket.connected) joinRoom();

        // Handle incoming real-time notifications
        notificationHandler = (data: any) => {
          console.log(`📥 [useNotifications] notification_received — type: ${data.type}`);

          if (!mountedRef.current) return;

          // Immediately bump unread badge with a temp entry so the bell reacts instantly
          const temp: Notification = {
            id: `temp_${Date.now()}`,
            user_id: '',
            title: data.title ?? '',
            message: data.message ?? '',
            type: data.type && data.type !== 'alert' ? data.type : 'booking',
            is_read: false,
            created_at: new Date().toISOString(),
            related_id: data.related_id ?? data.reservation_id ?? data.reservationId ?? null,
          };
          setNotifications((prev) => {
            // Avoid duplicates for same related_id
            if (
              temp.related_id &&
              prev.some((n) => n.related_id === temp.related_id && n.type === temp.type)
            ) {
              return prev;
            }
            return [temp, ...prev];
          });
          setUnreadCount((prev) => prev + 1);

          // Re-fetch from DB after 1.5 s so temp entry is replaced by the persisted row
          if (refetchTimer) clearTimeout(refetchTimer);
          refetchTimer = setTimeout(() => {
            if (mountedRef.current) fetchNotifications();
          }, 1500);
        };
        socket.on('notification_received', notificationHandler);

        disconnectHandler = () => {
          console.log('⚠️ [useNotifications] Socket disconnected');
        };
        socket.on('disconnect', disconnectHandler);

        connectErrorHandler = (err: any) => {
          console.error('❌ [useNotifications] Socket connect error:', err?.message ?? err);
        };
        socket.on('connect_error', connectErrorHandler);
      } catch (err: any) {
        console.error('❌ [useNotifications] WebSocket setup error:', err?.message);
      }
    };

    setupWebSocket();

    return () => {
      mountedRef.current = false;
      if (refetchTimer) clearTimeout(refetchTimer);
      if (!sharedSocket) return;
      if (connectHandler) sharedSocket.off('connect', connectHandler);
      if (notificationHandler) sharedSocket.off('notification_received', notificationHandler);
      if (disconnectHandler) sharedSocket.off('disconnect', disconnectHandler);
      if (connectErrorHandler) sharedSocket.off('connect_error', connectErrorHandler);
    };
  }, [fetchNotifications]);

  // ── Initial DB fetch on mount ────────────────────────────────────────
  useEffect(() => {
    fetchNotifications();
  }, []);

  // ── Polling fallback — re-fetch every 30 s in case WebSocket misses ──
  useEffect(() => {
    const id = setInterval(() => {
      if (mountedRef.current) fetchNotifications();
    }, 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
