import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/app/config/apiConfig';

interface BookingUpdate {
  id: string;
  status: string;
  action: string;
  message: string;
  reason?: string;
}

// Maps notification type → action string for handleBookingUpdate callback
const TYPE_TO_ACTION: Record<string, string> = {
  booking_confirmed: 'confirmed',
  booking_rejected: 'rejected',
  booking_cancelled: 'cancelled',
  booking_modified: 'modified',
  booking_completed: 'completed',
  booking_arrived: 'arrived',
};

export const useBookingUpdates = (
  customerId: string | undefined,
  onBookingUpdate: (update: BookingUpdate) => void
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!customerId) return;

    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('⚠️ No token found, cannot setup WebSocket');
          return;
        }

        const socket = io(API_CONFIG.BASE_URL, {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        const joinRoom = () => {
          socket.emit('join_room', customerId);
          console.log('🚪 [useBookingUpdates] Joined customer room:', customerId);
        };

        socket.on('connect', () => {
          console.log('✅ [useBookingUpdates] WebSocket connected:', socket.id);
          joinRoom();
        });

        // If already connected, join room immediately
        if (socket.connected) joinRoom();

        // Primary handler: notification_received (current backend)
        socket.on('notification_received', (data: any) => {
          console.log('📥 [useBookingUpdates] notification_received:', data.type);
          const action = TYPE_TO_ACTION[data.type];
          if (action) {
            onBookingUpdate({
              id: data.related_id || data.reservation_id || '',
              status: action,
              action,
              message: data.message || data.title || '',
              reason: data.message,
            });
          }
        });

        // Legacy event names — kept as fallback so older backend versions still work
        socket.on('booking_confirmed', (update: BookingUpdate) => {
          console.log('📥 [useBookingUpdates] booking_confirmed (legacy)');
          onBookingUpdate({ ...update, action: update.action || 'confirmed' });
        });
        socket.on('booking_rejected', (update: BookingUpdate) => {
          console.log('📥 [useBookingUpdates] booking_rejected (legacy)');
          onBookingUpdate({ ...update, action: update.action || 'rejected' });
        });
        socket.on('booking_cancelled', (update: BookingUpdate) => {
          console.log('📥 [useBookingUpdates] booking_cancelled (legacy)');
          onBookingUpdate({ ...update, action: update.action || 'cancelled' });
        });

        socket.on('disconnect', () => console.log('❌ [useBookingUpdates] disconnected'));
        socket.on('error', (error) => console.error('❌ [useBookingUpdates] error:', error));

        socketRef.current = socket;
      } catch (error) {
        console.error('❌ Error setting up useBookingUpdates socket:', error);
      }
    };

    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [customerId, onBookingUpdate]);

  return socketRef.current;
};
