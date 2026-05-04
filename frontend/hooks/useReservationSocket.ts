import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/app/config/apiConfig';

interface ReservationUpdate {
  id: string;
  status: string;
  action: string;
  message: string;
}

function decodeJwt(token: string): any | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)));
  } catch {
    return null;
  }
}

// Maps notification type → short action name expected by handleReservationUpdate
const TYPE_TO_ACTION: Record<string, string> = {
  booking_received: 'received',
  booking_confirmed: 'confirmed',
  booking_rejected: 'rejected',
  booking_cancelled: 'cancelled',
  booking_modified: 'modified',
  booking_arrived: 'arrived',
  booking_completed: 'completed',
};

export const useReservationSocket = (
  restaurantId: string | undefined,
  onReservationUpdate: (update: ReservationUpdate) => void
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // restaurantId is kept as a dependency trigger — actual room uses userId from JWT
    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('⚠️ [useReservationSocket] No token found');
          return;
        }

        // Decode JWT to get the merchant's userId for room membership
        const decoded = decodeJwt(token);
        const userId = decoded?.sub || decoded?.id || '';

        if (!userId) {
          console.warn('⚠️ [useReservationSocket] Could not decode userId from JWT');
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
          socket.emit('join_room', userId);
          console.log('🚪 [useReservationSocket] Joined merchant room:', userId);
        };

        socket.on('connect', () => {
          console.log('✅ [useReservationSocket] WebSocket connected:', socket.id);
          joinRoom();
        });

        // If already connected, join room immediately
        if (socket.connected) joinRoom();

        // Primary handler: notification_received (current backend)
        socket.on('notification_received', (data: any) => {
          console.log('📥 [useReservationSocket] notification_received:', data.type);
          const action = TYPE_TO_ACTION[data.type];
          if (action) {
            onReservationUpdate({
              id: data.related_id || data.reservation_id || '',
              status: action,
              action,
              message: data.message || data.title || '',
            });
          }
        });

        // Legacy handler — kept for backward compatibility
        socket.on('reservation_updated', (update: ReservationUpdate) => {
          console.log('📥 [useReservationSocket] reservation_updated (legacy):', update);
          onReservationUpdate(update);
        });

        socket.on('disconnect', () => console.log('❌ [useReservationSocket] disconnected'));
        socket.on('error', (error) => console.error('❌ [useReservationSocket] error:', error));

        socketRef.current = socket;
      } catch (error) {
        console.error('❌ [useReservationSocket] setup error:', error);
      }
    };

    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [restaurantId, onReservationUpdate]);

  return socketRef.current;
};
