import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useBookingUpdates } from '@/hooks/useBookingUpdates';
import CustomButton from '@/components/CustomButton';

/* ── Types ── */

type BookingStatus = 'Upcoming' | 'Confirmed' | 'Past' | 'Cancelled';

type Booking = {
  id: string;
  name: string;
  ref: string;
  date: string;
  time: string;
  guests: number;
  table?: number;
  status: BookingStatus;
  dbStatus?: string;
  image: ImageSourcePropType | string;
  imageUrl?: string;
  address?: string;
  restaurantId?: string;
};

const TABS = ['Upcoming', 'Past', 'Cancelled / Modified'] as const;

/* ── Component ── */

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { isGuest } = useAuth();

  // Handle real-time booking updates from WebSocket
  const handleBookingUpdate = useCallback((update: any) => {
    console.log('📢 Real-time booking update received:', update);
    
    // Show notification
    if (update.action === 'confirmed') {
      Alert.alert('✅ Booking Confirmed!', 'The restaurant has confirmed your booking!');
    } else if (update.action === 'rejected') {
      Alert.alert('❌ Booking Rejected', update.reason || 'Your booking has been rejected by the restaurant.');
    } else if (update.action === 'cancelled') {
      Alert.alert('🚫 Booking Cancelled', 'Your booking has been cancelled.');
    }
    
    // Refresh bookings list immediately
    loadBookings();
  }, []);

  // WebSocket hook for real-time updates
  useBookingUpdates(customerId, handleBookingUpdate);

  // Fetch bookings from API
  const loadBookings = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        setLoading(false);
        return;
      }

      console.log('📋 Loading customer bookings...');
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/reservations/my-reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ Bookings loaded:', response.data);

      // Extract customer ID from token or first booking (for WebSocket)
      if (!customerId && response.data && response.data.length > 0) {
        // Try to decode JWT to get user ID
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const decoded = JSON.parse(
              Buffer.from(parts[1], 'base64').toString('utf-8')
            );
            if (decoded.sub) {
              setCustomerId(decoded.sub);
              console.log('🆔 Customer ID set from token:', decoded.sub);
            }
          }
        } catch (e) {
          console.log('Could not decode JWT:', e);
        }
      }

      // Transform API data to UI format
      const transformedBookings: Booking[] = (response.data || []).map((apiBooking: any) => {
        const bookingStatus = getBookingStatus(apiBooking.status);
        const restaurantImageUrl = apiBooking.restaurants?.image_url;
        
        console.log(`📸 Booking: ${apiBooking.restaurants?.name || 'Unknown'}`);
        console.log(`   DB Status: "${apiBooking.status}" -> UI Status: "${bookingStatus}"`);
        console.log(`   Full restaurant data:`, apiBooking.restaurants);
        console.log(`   Image URL:`, restaurantImageUrl);
        
        return {
          id: apiBooking.id,
          name: apiBooking.restaurants?.name || 'Restaurant',
          ref: `RRA-${apiBooking.id.slice(0, 5).toUpperCase()}`,
          date: apiBooking.reservation_date,
          time: formatTime(apiBooking.reservation_time),
          guests: apiBooking.party_size,
          table: apiBooking.tables?.table_number,
          status: bookingStatus,
          dbStatus: apiBooking.status,
          image: restaurantImageUrl ? { uri: restaurantImageUrl } : require('@/assets/restaurant-1.jpg'),
          imageUrl: restaurantImageUrl,
          address: apiBooking.restaurant_address,
          restaurantId: apiBooking.restaurant_id,
        };
      });

      console.log('✅ Transformed bookings:', transformedBookings);
      console.log('Status distribution:');
      const statusCounts = {};
      transformedBookings.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      console.log(statusCounts);

      setBookings(transformedBookings);
    } catch (error: any) {
      console.error('❌ Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, [loadBookings]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  // Convert DB status to UI status
  const getBookingStatus = (dbStatus: string): BookingStatus => {
    if (dbStatus === 'completed' || dbStatus === 'past') return 'Past';
    if (dbStatus === 'cancelled' || dbStatus === 'rejected') return 'Cancelled';
    if (dbStatus === 'confirmed' || dbStatus === 'arrived') return 'Confirmed';
    return 'Upcoming'; // pending only
  };

  // Format time from HH:MM to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m}${ampm}`;
  };

  // Check if current time is more than 30 minutes away from reservation
  const canModifyBooking = (booking: Booking): boolean => {
    if (booking.status !== 'Upcoming' && booking.status !== 'Confirmed') return false;
    
    const reservationDateTime = new Date(`${booking.date}T${booking.time.replace(/[APM]/g, '').trim()}`);
    const now = new Date();
    const timeDiffMs = reservationDateTime.getTime() - now.getTime();
    const timeDiffMinutes = timeDiffMs / (1000 * 60);
    
    return timeDiffMinutes > 30; // Can modify if more than 30 minutes away
  };

  const tabStatusMap: Record<number, BookingStatus[]> = {
    0: ['Upcoming', 'Confirmed'],
    1: ['Past'],
    2: ['Cancelled'],
  };

  const filtered = bookings.filter((b) =>
    tabStatusMap[activeTab]?.includes(b.status)
  );

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed':
        return '#10b981'; // green
      case 'Upcoming':
        return Colors.primary;
      case 'Past':
        return '#B8960C';
      case 'Cancelled':
        return Colors.accent;
    }
  };

  const handleModify = (booking: Booking) => {
    if (!canModifyBooking(booking)) {
      Alert.alert(
        'Cannot Modify',
        'You can only modify your booking more than 30 minutes before the reservation time.'
      );
      return;
    }

    router.push({
      pathname: '../modify-booking',
      params: {
        id: booking.id,
        restaurantId: booking.restaurantId || '',
        name: booking.name,
        ref: booking.ref,
        date: booking.date,
        time: booking.time,
        guests: String(booking.guests),
        table: String(booking.table ?? 0),
        address: booking.address ?? '',
      },
    } as any);
  };

  const handleCancel = async (booking: Booking) => {
    if (!canModifyBooking(booking)) {
      Alert.alert(
        'Cannot Cancel',
        'You cannot cancel within 30 minutes of your reservation time.'
      );
      return;
    }

    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking at ${booking.name}?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Error', 'Authentication failed');
                return;
              }

              console.log('🗑️ Cancelling booking:', booking.id);
              await axios.delete(`${API_CONFIG.BASE_URL}/api/reservations/${booking.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              console.log('✅ Booking cancelled successfully');
              Alert.alert('Success', 'Your booking has been cancelled');
              loadBookings(); // Refresh the list
            } catch (error: any) {
              console.error('❌ Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {isGuest ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Guest view */}
          <View style={styles.guestViewContainer}>
            <View style={styles.guestIcon}>
              <Ionicons name="lock-closed-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.guestTitle}>Login Required</Text>
            <Text style={styles.guestMessage}>Sign in to your account to view and manage your bookings.</Text>
            <CustomButton
              title="Log In"
              onPress={() => router.push('/login')}
              variant="primary"
            />
            <TouchableOpacity onPress={() => router.push('/account-type')} style={styles.guestSignupLink}>
              <Text style={styles.guestSignupText}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <Text style={styles.heading}>Booking History</Text>
          <Text style={styles.subHeading}>Manage your reservations</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading your bookings...</Text>
            </View>
          ) : (
            <>
              {/* Tab selector */}
              <View style={styles.tabRow}>
                {TABS.map((tab, idx) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === idx && styles.tabActive]}
                    onPress={() => setActiveTab(idx)}
                  >
                    <Text
                      style={[styles.tabText, activeTab === idx && styles.tabTextActive]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Booking cards */}
              {filtered.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color={Colors.border} />
                  <Text style={styles.emptyText}>No {TABS[activeTab].toLowerCase()} bookings</Text>
                </View>
              )}

              {filtered.map((booking) => {
                const canModify = canModifyBooking(booking);
                return (
                  <View key={booking.id} style={styles.bookingCard}>
                    {/* Top section */}
                    <View style={styles.bookingTop}>
                      <Image 
                        source={
                          typeof booking.image === 'string' 
                            ? { uri: booking.image }
                            : booking.image
                        }
                        style={styles.bookingImage}
                        defaultSource={require('@/assets/restaurant-1.jpg')}
                        onLoad={() => console.log(`✅ Image loaded for: ${booking.name}`)}
                        onError={(error) => {
                          console.log(`⚠️  Image failed to load for ${booking.name}:`, error);
                          console.log(`   Attempted URL:`, typeof booking.image === 'string' ? booking.image : 'local image');
                        }}
                      />
                      <View style={styles.bookingInfo}>
                        <View style={styles.bookingNameRow}>
                          <Text style={styles.bookingName} numberOfLines={1}>
                            {booking.name}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { borderColor: getStatusColor(booking.status) },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { color: getStatusColor(booking.status) },
                              ]}
                            >
                              {booking.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.refText}>Ref: {booking.ref}</Text>
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                          <Text style={styles.detailText}>{booking.date}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Ionicons name="time-outline" size={14} color={Colors.primary} />
                          <Text style={styles.detailText}>{booking.time}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Ionicons name="people-outline" size={14} color={Colors.primary} />
                          <Text style={styles.detailText}>
                            {booking.guests} Guest{booking.guests > 1 ? 's' : ''}
                            {booking.table ? ` \u2022 Table ${booking.table}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action buttons — vary by status */}
                    {(booking.status === 'Upcoming' || booking.status === 'Confirmed') && (
                      <View style={styles.bookingActions}>
                        <TouchableOpacity
                          style={[styles.modifyBtn, !canModify && styles.disabledBtn]}
                          onPress={() => handleModify(booking)}
                          disabled={!canModify}
                        >
                          <Text style={[styles.modifyText, !canModify && styles.disabledText]}>
                            Modify
                          </Text>
                          {!canModify && (
                            <Text style={styles.timeWarning}>(within 30 min)</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.cancelBtn, !canModify && styles.disabledBtn]}
                          onPress={() => handleCancel(booking)}
                          disabled={!canModify}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={canModify ? Colors.accent : Colors.gray}
                          />
                          <Text style={[styles.cancelText, !canModify && styles.disabledText]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {booking.status === 'Past' && (
                      <TouchableOpacity style={styles.reviewBtn}>
                        <Text style={styles.reviewText}>Leave Review</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Loading state */
  loadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 12,
  },

  /* Header */
  heading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  subHeading: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
    marginBottom: 20,
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cream,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FDF6E0',
    borderRadius: 14,
  },
  tabText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
  },
  tabTextActive: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.text,
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.gray,
  },

  /* Booking card */
  bookingCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cream,
    padding: 14,
    marginBottom: 16,
  },
  bookingTop: {
    flexDirection: 'row',
    gap: 12,
  },
  bookingImage: {
    width: 100,
    height: 100,
    borderRadius: 14,
    resizeMode: 'cover',
  },
  bookingInfo: {
    flex: 1,
    gap: 3,
  },
  bookingNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
  },
  refText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.text,
  },

  /* Actions */
  bookingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modifyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modifyText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  cancelText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.accent,
  },
  disabledBtn: {
    opacity: 0.5,
    borderColor: Colors.gray,
  },
  disabledText: {
    color: Colors.gray,
  },
  timeWarning: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    color: Colors.gray,
  },
  reviewBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  reviewText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },

  /* Guest view */
  guestViewContainer: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestIcon: {
    marginBottom: 24,
  },
  guestTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  guestMessage: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  guestSignupLink: {
    marginTop: 12,
    paddingVertical: 8,
  },
  guestSignupText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
