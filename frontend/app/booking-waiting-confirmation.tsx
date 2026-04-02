import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';

const POLLING_INTERVAL = 3000; // Poll every 3 seconds
const MAX_WAIT_TIME = 60000; // 1 minute max wait (reduced from 5 minutes for testing)

export default function BookingWaitingConfirmationScreen() {
  const params = useLocalSearchParams<{
    bookingId?: string;
    name: string;
    ref: string;
    date: string;
    time: string;
    guests: string;
    table: string;
    bookingName: string;
    bookingEmail: string;
    address: string;
  }>();
  const router = useRouter();

  const [bookingStatus, setBookingStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pulseAnim = new Animated.Value(0);
  const bookingId = params.bookingId || '';

  // Animate pulse effect
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Polling mechanism to check booking status
  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let timeInterval: ReturnType<typeof setInterval> | null = null;
    let startTime = Date.now();

    const pollBookingStatus = async () => {
      try {
        if (!bookingId) {
          console.log('No booking ID provided');
          return;
        }

        // Get auth token
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.error('No auth token found');
          return;
        }

        console.log('📋 Polling booking status:', bookingId);
        
        const response = await axios.get(
          `${API_CONFIG.BASE_URL}/api/reservations/${bookingId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        );

        const status = response.data?.status || 'pending';
        console.log('✓ Booking status:', status);
        setBookingStatus(status);

        // If status changed from pending, stop polling and show result
        if (status === 'confirmed') {
          if (pollInterval) clearInterval(pollInterval);
          if (timeInterval) clearInterval(timeInterval);
          
          // Create notification for confirmed booking
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.post(
              `${API_CONFIG.BASE_URL}/api/notifications/test-create`,
              {
                title: '✅ Booking Confirmed',
                message: `Your reservation at ${params.name} on ${params.date} at ${params.time} has been confirmed!`,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              }
            );
            console.log('✓ Notification created');
          } catch (notificationError: any) {
            console.error('Failed to create notification:', notificationError.message);
          }
          
          setTimeout(() => {
            Alert.alert(
              '✅ Booking Confirmed!',
              'Your reservation has been confirmed by the restaurant.',
              [
                {
                  text: 'Back Home',
                  onPress: () => router.push('/'),
                },
              ]
            );
          }, 500);
        } else if (status === 'rejected') {
          if (pollInterval) clearInterval(pollInterval);
          if (timeInterval) clearInterval(timeInterval);
          
          // Create notification for rejected booking
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.post(
              `${API_CONFIG.BASE_URL}/api/notifications/test-create`,
              {
                title: '❌ Booking Rejected',
                message: `Your reservation request at ${params.name} on ${params.date} could not be confirmed. Please try another date or time.`,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              }
            );
            console.log('✓ Rejection notification created');
          } catch (notificationError: any) {
            console.error('Failed to create notification:', notificationError.message);
          }
          
          setTimeout(() => {
            Alert.alert(
              '❌ Booking Rejected',
              'Unfortunately, your reservation could not be confirmed. Please try another date or time.',
              [
                {
                  text: 'Try Again',
                  onPress: () => router.back(),
                },
              ]
            );
          }, 500);
        }
      } catch (error: any) {
        console.error('Error polling booking status:', error.message);
        if (error.response?.status === 401) {
          console.error('Unauthorized - Token may be expired');
        }
      }
    };

    // Start polling
    pollBookingStatus(); // Check immediately
    pollInterval = setInterval(pollBookingStatus, POLLING_INTERVAL);

    // Track elapsed time
    timeInterval = setInterval(() => {
      const newElapsed = Date.now() - startTime;
      setElapsedTime(newElapsed);

      // Stop polling after max wait time
      if (newElapsed > MAX_WAIT_TIME) {
        if (pollInterval) clearInterval(pollInterval);
        if (timeInterval) clearInterval(timeInterval);
        
        // Create notification for pending booking (timeout)
        (async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.post(
              `${API_CONFIG.BASE_URL}/api/notifications/test-create`,
              {
                title: '📋 Booking Received',
                message: `Your reservation request at ${params.name} has been received. The restaurant will confirm shortly. Check your bookings list for updates.`,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              }
            );
            console.log('✓ Timeout notification created');
          } catch (notificationError: any) {
            console.error('Failed to create notification:', notificationError.message);
          }
        })();
        
        setTimeout(() => {
          Alert.alert(
            '✅ Booking Received',
            'Your booking request has been received. The restaurant will confirm shortly. You can check your bookings list for updates.',
            [
              {
                text: 'Back Home',
                onPress: () => router.push('/'),
              },
              {
                text: 'View Bookings',
                onPress: () => router.replace('/(tabs)/bookings'),
              },
            ]
          );
        }, 500);
      }
    }, 100);

    setLoading(false);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timeInterval) clearInterval(timeInterval);
    };
  }, [bookingId, router]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Animated waiting indicator */}
      <View style={styles.loaderContainer}>
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="hourglass-outline" size={64} color={Colors.primary} />
        </Animated.View>
      </View>

      {/* Main message */}
      <Text style={styles.title}>Waiting for Confirmation</Text>
      <Text style={styles.subtitle}>
        Your booking has been sent to the restaurant. Please wait for confirmation.
      </Text>

      {/* Booking details card */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Reference</Text>
            <Text style={styles.detailValue}>{params.ref}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="location-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Restaurant</Text>
            <Text style={styles.detailValue}>{params.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>{params.date} at {params.time}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="people-outline" size={18} color={Colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Party Size</Text>
            <Text style={styles.detailValue}>{params.guests} Guest(s)</Text>
          </View>
        </View>
      </View>

      {/* Waiting status info */}
      <View style={styles.statusCard}>
        <View style={styles.statusContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.statusText}>Waiting for Restaurant Response</Text>
          <Text style={styles.elapsedTime}>Elapsed: {formatTime(elapsedTime)}</Text>
        </View>
      </View>

      {/* Info message */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#2BA15C" />
        <Text style={styles.infoText}>
          You will receive a notification once the restaurant confirms or rejects your booking.
        </Text>
      </View>

      {/* Cancel button */}
      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => {
          Alert.alert(
            'Cancel Request',
            'Are you sure you want to cancel this booking request?',
            [
              { text: 'Keep Waiting', style: 'cancel' },
              {
                text: 'Cancel Request',
                style: 'destructive',
                onPress: () => router.back(),
              },
            ]
          );
        }}
      >
        <Text style={styles.cancelBtnText}>Cancel Request</Text>
      </TouchableOpacity>

      {/* Back Home button */}
      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => {
          // Stop polling by replacing the screen
          router.push('/');
        }}
      >
        <Ionicons name="home" size={20} color={Colors.primary} />
        <Text style={styles.homeBtnText}>Back Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loaderContainer: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pulseCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  statusCard: {
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 24,
    marginBottom: 16,
  },
  statusContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  elapsedTime: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#F0F8F4',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2BA15C',
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: '#2BA15C',
    flex: 1,
    lineHeight: 18,
  },
  cancelBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.accent,
  },
  homeBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  homeBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: '#FFF',
  },
});
