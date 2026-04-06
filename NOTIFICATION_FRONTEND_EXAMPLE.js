// =====================================================
// NOTIFICATION SYSTEM - Frontend Examples
// =====================================================
// Copy these examples into your project to add notifications

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, ToastAndroid, Platform } from 'react-native';

// =====================================================
// Example 1: Socket.IO Notification Listener Hook
// =====================================================
export const useBookingNotifications = () => {
  const navigation = useNavigation();

  useEffect(() => {
    // Get Socket.IO instance - adjust based on your setup
    const socket = require('socket.io-client')('http://your-backend-url:5000', {
      auth: {
        token: 'your-jwt-token' // from AsyncStorage or state management
      }
    });

    // Listen for notification_received events
    socket.on('notification_received', (notification) => {
      console.log('🔔 New Notification:', notification.title);
      
      // Show user-facing notification
      if (Platform.OS === 'android') {
        ToastAndroid.show(notification.title, ToastAndroid.LONG);
      } else {
        Alert.alert(notification.title, notification.message);
      }

      // Optional: Refresh reservation list
      if (notification.type === 'booking_confirmed' || notification.type === 'booking_rejected') {
        // Dispatch action to refresh reservations list
        // refreshReservations();
      }

      // Optional: Update badge counter
      // fetchUnreadNotificationCount();
    });

    // Listen for old-style booking-update events (backward compatibility)
    socket.on('reservation_updated', (data) => {
      console.log('📋 Reservation Updated:', data.message);
      Alert.alert('Reservation Updated', data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.off('notification_received');
      socket.off('reservation_updated');
      socket.disconnect();
    };
  }, []);
};

// =====================================================
// Example 2: Fetch notifications from database
// =====================================================
export const fetchNotifications = async (token) => {
  try {
    const response = await fetch('http://your-backend-url/api/notifications', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    return data; // Array of notifications
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// =====================================================
// Example 3: Mark notification as read
// =====================================================
export const markNotificationAsRead = async (notificationId, token) => {
  try {
    const response = await fetch(
      `http://your-backend-url/api/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// =====================================================
// USAGE EXAMPLES IN COMPONENTS (Copy to your project)
// =====================================================

/*
// Example Screen 1: Using the notification hook in your existing Reservations screen
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useBookingNotifications } from '@/hooks/useBookingNotifications';
import { useRouter } from 'expo-router';

export default function ReservationsScreen() {
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listen for notification updates
  useBookingNotifications();

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      // Fetch your reservations from API
      setLoading(false);
    } catch (error) {
      console.error('Error loading reservations:', error);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Reservations</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" />
      ) : (
        <ScrollView>
          {reservations.length > 0 ? (
            reservations.map((reservation) => (
              <View key={reservation.id} style={styles.card}>
                <Text style={styles.cardTitle}>{reservation.restaurant_name}</Text>
                <Text>{reservation.date} at {reservation.time}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No reservations yet</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// Example Screen 2: Notifications list display
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function NotificationsScreen({ token }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await fetchNotifications(token);
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId, token);
    loadNotifications(); // Refresh list
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reservations Notifications</Text>
      
      {notifications.map((notification) => (
        <TouchableOpacity 
          key={notification.id}
          style={[
            styles.notificationCard,
            !notification.is_read && styles.unread
          ]}
          onPress={() => handleMarkAsRead(notification.id)}
        >
          <View style={styles.iconContainer}>
            <Ionicons 
              name={notification.type === 'booking_confirmed' ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={notification.type === 'booking_confirmed' ? '#4CAF50' : '#f44336'}
            />
          </View>
          
          <View style={styles.contentContainer}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage}>{notification.message}</Text>
            <Text style={styles.timestamp}>
              {new Date(notification.created_at).toLocaleString()}
            </Text>
          </View>

          {!notification.is_read && (
            <View style={styles.badge} />
          )}
        </TouchableOpacity>
      ))}

      {notifications.length === 0 && !loading && (
        <Text style={styles.emptyText}>No notifications yet</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  unread: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
'*/ 
