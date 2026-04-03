import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/app/config/apiConfig';

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
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

      // Update local state
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      
      console.log(`✅ Notification ${notificationId} deleted`);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    }
  }, []);

  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        console.log('🔌 Setting up WebSocket for notifications...');
        
        const newSocket = io(API_CONFIG.BASE_URL, {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        newSocket.on('connect', () => {
          console.log('✅ WebSocket connected for notifications');
        });

        newSocket.on('notification_received', (data: any) => {
          console.log('📥 New notification received:', data);
          
          // Add new notification to the beginning of the list
          const newNotification: Notification = {
            id: `temp_${Date.now()}`,
            user_id: '',
            title: data.title,
            message: data.message,
            type: data.type || 'booking',
            is_read: false,
            created_at: new Date().toISOString(),
          };
          
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        });

        newSocket.on('disconnect', () => {
          console.log('⚠️ WebSocket disconnected');
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('❌ WebSocket setup error:', error);
      }
    };

    setupWebSocket();

    return () => {
      socket?.disconnect();
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
