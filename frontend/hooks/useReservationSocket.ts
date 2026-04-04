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

export const useReservationSocket = (
  restaurantId: string | undefined,
  onReservationUpdate: (update: ReservationUpdate) => void
) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('⚠️ No token found, cannot setup WebSocket');
          return;
        }

        // Create socket connection
        const socket = io(API_CONFIG.BASE_URL, {
          auth: {
            token: token,
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
          console.log('✅ WebSocket connected:', socket.id);
          
          // Join the restaurant's private room
          socket.emit('join_room', restaurantId);
          console.log('🚪 Joined restaurant room:', restaurantId);
        });

        socket.on('reservation_updated', (update: ReservationUpdate) => {
          console.log('📥 Received reservation update:', update);
          onReservationUpdate(update);
        });

        socket.on('disconnect', () => {
          console.log('❌ WebSocket disconnected');
        });

        socket.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
        });

        socketRef.current = socket;
      } catch (error) {
        console.error('❌ Error setting up WebSocket:', error);
      }
    };

    setupSocket();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [restaurantId, onReservationUpdate]);

  return socketRef.current;
};
