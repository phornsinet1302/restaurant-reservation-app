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
          console.log('✅ WebSocket connected for customer:', socket.id);
          
          // Join the customer's private room
          socket.emit('join_room', customerId);
          console.log('🚪 Joined customer room:', customerId);
        });

        // Listen for booking confirmation
        socket.on('booking_confirmed', (update: BookingUpdate) => {
          console.log('📥 Booking confirmed event received:', update);
          onBookingUpdate(update);
        });

        // Listen for booking rejection
        socket.on('booking_rejected', (update: BookingUpdate) => {
          console.log('📥 Booking rejected event received:', update);
          onBookingUpdate(update);
        });

        // Listen for booking cancellation
        socket.on('booking_cancelled', (update: BookingUpdate) => {
          console.log('📥 Booking cancelled event received:', update);
          onBookingUpdate(update);
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
  }, [customerId, onBookingUpdate]);

  return socketRef.current;
};
