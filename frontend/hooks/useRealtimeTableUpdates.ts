/**
 * 🔌 Real-time Table Status Updates
 * Add this hook to your tables frontend to get LIVE updates when table status changes
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/app/config/apiConfig';

interface TableType {
  id: string;
  table_number?: number;
  capacity?: number;
  status: string;
  restaurant_id?: string;
  [key: string]: any;
}

export const useRealtimeTableUpdates = (restaurantId: string, initialTables: TableType[] = []): { realtimeTables: TableType[]; loading: boolean } => {
  const [realtimeTables, setRealtimeTables] = useState<TableType[]>(initialTables);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    let socket: any = null;

    const setupSocket = async () => {
      try {
        // Get token from AsyncStorage
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('⚠️ No token available for WebSocket');
          return;
        }

        // Import socket.io-client
        const { io } = require('socket.io-client');

        // Connect to WebSocket
        socket = io(API_CONFIG.BASE_URL.replace('/api', ''), {
          auth: {
            token: token
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        // Listen for connection
        socket.on('connect', () => {
          console.log('✅ WebSocket connected for real-time table updates');
        });

        // Listen for table status updates
        socket.on('table_status_updated', (data: any) => {
          console.log('📊 Real-time table update received:', data);

          const { table_id, status, restaurant_id: eventRestaurantId } = data;

          // Update only if it's for this restaurant
          if (eventRestaurantId === restaurantId) {
            setRealtimeTables((prevTables: TableType[]) =>
              prevTables.map((table: TableType) =>
                table.id === table_id
                  ? { ...table, status: status }
                  : table
              )
            );

            console.log(`✅ Table ${table_id} status updated to: ${status}`);
          }
        });

        // Listen for errors
        socket.on('connect_error', (error: any) => {
          console.log('⚠️ WebSocket connection error:', error.message);
        });

      } catch (error) {
        console.log('⚠️ WebSocket setup error:', error);
      }
    };

    setupSocket();

    // Cleanup
    return () => {
      if (socket) {
        socket.off('table_status_updated');
        socket.off('connect');
        socket.off('connect_error');
        socket.disconnect();
      }
    };
  }, [restaurantId]);

  return { realtimeTables, loading };
};
