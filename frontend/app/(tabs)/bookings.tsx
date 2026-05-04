import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
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
import { useAppToast } from '@/components/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

let LAST_BOOKINGS_REFRESH_GLOBAL_MS = 0;

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

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
  /** Badge text — e.g. "No response" when pending expired after 24h past slot */
  statusLabel?: string;
  dbStatus?: string;
  image: ImageSourcePropType | string;
  imageUrl?: string;
  address?: string;
  restaurantId?: string;
  reservationDateRaw: string;
  reservationTimeRaw: string;
  special_requests?: string;
  customer_name?: string;
  customer_email?: string;
};

const MS_24H = 24 * 60 * 60 * 1000;

/** Parse reservation_date + reservation_time (API) into a local Date */
function parseReservationStart(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null;
  const t = (timeStr || '12:00:00').toString();
  const parts = t.split(':');
  const hh = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
  const mm = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
  const secPart = (parts[2] || '00').split('.')[0];
  const ss = String(parseInt(secPart, 10) || 0).padStart(2, '0');
  const d = new Date(`${dateStr}T${hh}:${mm}:${ss}`);
  return isNaN(d.getTime()) ? null : d;
}

/** True when now is more than 24 hours after the scheduled reservation start */
function isPast24HoursAfterSlot(dateStr: string, timeStr: string): boolean {
  const start = parseReservationStart(dateStr, timeStr);
  if (!start) return false;
  return Date.now() > start.getTime() + MS_24H;
}

function formatTimeFromApi(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

function getBookingStatusAndLabel(
  dbStatus: string,
  reservationDate: string,
  reservationTime: string,
): { status: BookingStatus; statusLabel?: string } {
  const expiredByTime = isPast24HoursAfterSlot(reservationDate, reservationTime);

  if (dbStatus === 'completed' || dbStatus === 'past') {
    return { status: 'Past' };
  }
  if (dbStatus === 'cancelled' || dbStatus === 'rejected') {
    return { status: 'Cancelled' };
  }

  if (expiredByTime && dbStatus === 'pending') {
    return { status: 'Past', statusLabel: 'No response' };
  }
  if (expiredByTime && (dbStatus === 'confirmed' || dbStatus === 'arrived')) {
    return { status: 'Past' };
  }

  if (dbStatus === 'confirmed' || dbStatus === 'arrived') {
    return { status: 'Confirmed' };
  }
  return { status: 'Upcoming' };
}

const TABS = ['Upcoming', 'Past', 'Cancelled'] as const;

/* ── Component ── */

export default function BookingsScreen() {
  const { toast, confirm } = useAppToast();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const lastBookingsRefreshRef = React.useRef(LAST_BOOKINGS_REFRESH_GLOBAL_MS);
  const BOOKINGS_REFRESH_COOLDOWN_MS = 30000;
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { isGuest, loading: authLoading } = useAuth();

  console.log('👀 [BookingsScreen] Rendered. isGuest:', isGuest, 'loading:', loading);

  // Fetch bookings from API
  const loadBookings = useCallback(async (force = false) => {
    const now = Date.now();
    const lastSeen = Math.max(lastBookingsRefreshRef.current, LAST_BOOKINGS_REFRESH_GLOBAL_MS);
    if (!force && now - lastSeen < BOOKINGS_REFRESH_COOLDOWN_MS) {
      console.log('⏱️ [loadBookings] Cooldown active. Skipping request.');
      setLoading(false); // ensure loading is cleared even when skipped
      return;
    }
    lastBookingsRefreshRef.current = now;
    LAST_BOOKINGS_REFRESH_GLOBAL_MS = now;
    
    console.log('🚀 [loadBookings] Starting to fetch bookings (force:', force, ')');
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 [loadBookings] Token retrieved:', token ? '✅ exists' : '❌ missing');
      
      if (!token) {
        console.log('⚠️  [loadBookings] No token found, skipping API call');
        setLoading(false);
        return;
      }

      console.log('📋 [loadBookings] Fetching bookings from:', API_CONFIG.BASE_URL + '/api/reservations/my-reservations');
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/reservations/my-reservations`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 25000,
      });
      setBookingError(null);

      console.log('✅ [loadBookings] API Response received:', response.data);

      // Extract customer ID from token or first booking (for WebSocket)
      if (!customerId && response.data && response.data.length > 0) {
        // Try to decode JWT to get user ID
        const decoded = decodeJwtPayload(token);
        if (decoded?.sub) {
          setCustomerId(decoded.sub);
          console.log('🆔 Customer ID set from token:', decoded.sub);
        } else if (decoded?.id) {
          setCustomerId(decoded.id);
          console.log('🆔 Customer ID set from token:', decoded.id);
        } else {
          console.log('Could not decode JWT: missing id/sub claim');
        }
      }

      // Transform API data to UI format
      const transformedBookings: Booking[] = (response.data || []).map((apiBooking: any) => {
        const dateRaw = apiBooking.reservation_date || '';
        const timeRaw = apiBooking.reservation_time || '';
        const { status: bookingStatus, statusLabel } = getBookingStatusAndLabel(
          apiBooking.status,
          dateRaw,
          timeRaw,
        );
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
          time: formatTimeFromApi(apiBooking.reservation_time),
          guests: apiBooking.party_size,
          table: apiBooking.tables?.table_number,
          status: bookingStatus,
          statusLabel,
          dbStatus: apiBooking.status,
          image: restaurantImageUrl ? { uri: restaurantImageUrl } : require('@/assets/restaurant-1.jpg'),
          imageUrl: restaurantImageUrl,
          address: apiBooking.restaurants?.address,
          restaurantId: apiBooking.restaurant_id,
          reservationDateRaw: dateRaw,
          reservationTimeRaw: timeRaw,
          special_requests: apiBooking.special_request || '',
          customer_name: apiBooking.customer_name || '',
          customer_email: apiBooking.customer_email || '',
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
      const isNetworkError =
        !error.response &&
        (error.message === 'Network Error' ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK');

      if (isNetworkError) {
        console.warn('⚠️ [CustomerBookings] No internet connection');
        setBookingError('No internet connection. Please check your network and try again.');
      } else {
        console.warn('⚠️ [CustomerBookings] Error loading bookings:', error.response?.status, error.message);
        setBookingError('Could not load bookings. Please try again.');
      }
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // Handle real-time booking updates from WebSocket
  const handleBookingUpdate = useCallback((update: any) => {
    console.log('📢 Real-time booking update received:', update);

    if (update.action === 'confirmed') {
      toast('The restaurant has confirmed your booking!', 'success');
    } else if (update.action === 'rejected') {
      toast(update.reason || 'Your booking has been rejected by the restaurant.', 'info');
    } else if (update.action === 'cancelled') {
      toast('Your booking has been cancelled.', 'info');
    }

    // Force refresh after critical booking state changes.
    void loadBookings(true);
  }, [toast, loadBookings]);

  // WebSocket hook for real-time updates
  useBookingUpdates(customerId, handleBookingUpdate);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings(true);
    setRefreshing(false);
  }, [loadBookings]);

  useFocusEffect(
    useCallback(() => {
      if (refreshing) return; // don't double-fetch during manual pull-to-refresh
      loadBookings();
    }, [loadBookings, refreshing])
  );

  // Modify is only allowed for pending (Upcoming) bookings — not after merchant confirms
  const canModifyBooking = (booking: Booking): boolean => {
    if (booking.status !== 'Upcoming') return false;
    const start = parseReservationStart(booking.reservationDateRaw, booking.reservationTimeRaw);
    if (!start) return false;
    return (start.getTime() - Date.now()) / (1000 * 60) > 30;
  };

  // Cancel is allowed for both pending and confirmed bookings (within 30 min of slot)
  const canCancelBooking = (booking: Booking): boolean => {
    if (booking.status !== 'Upcoming' && booking.status !== 'Confirmed') return false;
    const start = parseReservationStart(booking.reservationDateRaw, booking.reservationTimeRaw);
    if (!start) return false;
    return (start.getTime() - Date.now()) / (1000 * 60) > 30;
  };

  const handleLeaveReview = (booking: Booking) => {
    if (!booking.restaurantId) {
      toast('Missing restaurant for this booking.', 'error');
      return;
    }
    router.push({
      pathname: '/restaurant-detail',
      params: {
        id: booking.restaurantId,
        name: booking.name,
        address: booking.address || '',
        openReview: '1',
      },
    } as any);
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
    if (booking.status === 'Confirmed') {
      toast('This booking has been confirmed by the restaurant and can no longer be modified.', 'warning');
      return;
    }
    if (!canModifyBooking(booking)) {
      toast('You can only modify your booking more than 30 minutes before the reservation time.', 'warning');
      return;
    }

    router.push({
      pathname: '../modify-booking',
      params: {
        id: booking.id,
        restaurantId: booking.restaurantId || '',
        restaurantName: booking.name || 'Restaurant',
        bookingName: booking.customer_name || '',
        bookingEmail: booking.customer_email || '',
        ref: booking.ref,
        date: booking.date,
        time: booking.time,
        guests: String(booking.guests),
        table: String(booking.table ?? 0),
        address: booking.address ?? '',
        specialRequests: booking.special_requests || '',
      },
    } as any);
  };

  const handleCancel = async (booking: Booking) => {
    if (!canCancelBooking(booking)) {
      toast('You cannot cancel within 30 minutes of your reservation time.', 'warning');
      return;
    }

    confirm('Cancel Booking', `Are you sure you want to cancel your booking at ${booking.name}?`, [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                toast('Authentication failed', 'error');
                return;
              }

              console.log('🗑️ Cancelling booking:', booking.id);
              await axios.delete(`${API_CONFIG.BASE_URL}/api/reservations/${booking.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              console.log('✅ Booking cancelled successfully');
              toast('Your booking has been cancelled', 'success');
              loadBookings(true); // Force refresh after mutation
            } catch (error: any) {
              console.error('❌ Error cancelling booking:', error);
              toast('Failed to cancel booking', 'error');
            }
          },
        },
      ]);
  };

  return (
    <View style={styles.container}>
      {authLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isGuest ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 16, 60) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.heading}>Booking History</Text>
          <Text style={styles.subHeading}>Manage your reservations</Text>

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
          contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 16, 60) }]}
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
              {bookingError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{bookingError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={() => void loadBookings(true)}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

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
                const canCancel = canCancelBooking(booking);
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
                              {booking.statusLabel || booking.status}
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
                        {/* Modify — hidden once merchant has confirmed */}
                        {booking.status === 'Upcoming' && (
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
                        )}
                        {/* Cancel — available for both Upcoming and Confirmed */}
                        <TouchableOpacity
                          style={[styles.cancelBtn, !canCancel && styles.disabledBtn]}
                          onPress={() => handleCancel(booking)}
                          disabled={!canCancel}
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color={canCancel ? Colors.accent : Colors.gray}
                          />
                          <Text style={[styles.cancelText, !canCancel && styles.disabledText]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {booking.status === 'Past' && (
                      <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() => handleLeaveReview(booking)}
                      >
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
  errorBox: {
    borderWidth: 1,
    borderColor: '#F3C4C4',
    backgroundColor: '#FFF6F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: '#A13A3A',
  },
  retryBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E4B3B3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  retryText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: '#7A1E1E',
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
