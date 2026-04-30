import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/app/config/apiConfig';

let sharedSocket: Socket | null = null;
let sharedSocketToken: string | null = null;

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

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  /** Reservation UUID when this notification is tied to a booking */
  related_id?: string | null;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      console.log('📢 Fetching notifications...');
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`✅ Fetched ${response.data.length} notifications`);
      setNotifications(response.data);
      
      // Calculate unread count
      const unread = response.data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.patch(
        `${API_CONFIG.BASE_URL}/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      setUnreadCount((prev) => Math.max(0, prev - 1));
      console.log(`✅ Notification ${notificationId} marked as read`);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.patch(
        `${API_CONFIG.BASE_URL}/api/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      
      setUnreadCount(0);
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      await axios.delete(
        `${API_CONFIG.BASE_URL}/api/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state and keep unread badge accurate
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === notificationId);
        if (target && !target.is_read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
      
      console.log(`✅ Notification ${notificationId} deleted`);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    }
  }, []);

  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    let mounted = true;
    let notificationHandler: ((data: any) => void) | null = null;
    let connectHandler: (() => void) | null = null;
    let disconnectHandler: (() => void) | null = null;
    let connectErrorHandler: ((error: any) => void) | null = null;

    const setupWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('⚠️ No token found for WebSocket setup');
          if (sharedSocket) {
            sharedSocket.disconnect();
            sharedSocket = null;
            sharedSocketToken = null;
          }
          return;
        }

        // Decode JWT to get user ID
        console.log('🔌 Setting up WebSocket for notifications...');
        let userId = '';
        const decoded = decodeJwtPayload(token);
        if (decoded) {
          userId = decoded.sub || decoded.id || '';
          console.log('👤 User ID from token:', userId);
        } else {
          console.warn('⚠️ Could not decode JWT payload');
        }
        
        if (!sharedSocket || sharedSocketToken !== token) {
          if (sharedSocket) {
            sharedSocket.disconnect();
          }
          sharedSocket = io(API_CONFIG.BASE_URL, {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
          });
          sharedSocketToken = token;
        }

        const activeSocket = sharedSocket;
        if (!activeSocket || !mounted) return;

        connectHandler = () => {
          console.log('✅ WebSocket connected for notifications. Socket ID:', activeSocket.id);
          
          // Join the user's private room for notifications
          if (userId) {
            activeSocket.emit('join_room', userId);
            console.log(`🚪 Emitted join_room with user ID: ${userId}`);
          } else {
            console.warn('⚠️ Could not extract user ID from token');
          }
        };
        activeSocket.on('connect', connectHandler);

        notificationHandler = (data: any) => {
          console.log('📥 New notification received:', data);
          console.log('   Title:', data.title);
          console.log('   Message:', data.message);
          console.log('   Type:', data.type);
          
          // Add new notification to the beginning of the list
          const newNotification: Notification = {
            id: `temp_${Date.now()}`,
            user_id: '',
            title: data.title,
            message: data.message,
            type: typeof data.type === 'string' && data.type !== 'alert' ? data.type : 'booking',
            is_read: false,
            created_at: new Date().toISOString(),
            related_id: data.related_id ?? data.reservation_id ?? data.reservationId ?? null,
          };
          
          if (!mounted) return;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          console.log('✅ Notification added to list');
        };
        activeSocket.on('notification_received', notificationHandler);

        disconnectHandler = () => {
          console.log('⚠️ WebSocket disconnected');
        };
        activeSocket.on('disconnect', disconnectHandler);

        connectErrorHandler = (error: any) => {
          console.error('❌ WebSocket error:', error);
        };
        activeSocket.on('connect_error', connectErrorHandler);
      } catch (error) {
        console.error('❌ WebSocket setup error:', error);
      }
    };

    setupWebSocket();

    return () => {
      mounted = false;
      if (!sharedSocket) return;
      if (connectHandler) {
        sharedSocket.off('connect', connectHandler);
      }
      if (notificationHandler) {
        sharedSocket.off('notification_received', notificationHandler);
      }
      if (disconnectHandler) {
        sharedSocket.off('disconnect', disconnectHandler);
      }
      if (connectErrorHandler) {
        sharedSocket.off('connect_error', connectErrorHandler);
      }
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, []);

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
