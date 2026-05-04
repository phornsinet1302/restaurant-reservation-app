import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { API_CONFIG } from '@/app/config/apiConfig';
import { reservationRowToBookingParams } from '@/utils/reservationNavigation';
import { useAppToast } from '@/components/ToastProvider';

/* ── Component ── */

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toast } = useAppToast();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const {
    notifications,
    loading,
    unreadCount,
    markAllAsRead,
    markAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return (
          <View style={[styles.iconCircle, styles.iconConfirmed]}>
            <Ionicons name="checkmark" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_rejected':
        return (
          <View style={[styles.iconCircle, styles.iconRejected]}>
            <Ionicons name="close" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_modified':
        return (
          <View style={[styles.iconCircle, styles.iconModified]}>
            <Ionicons name="pencil" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_cancelled':
        return (
          <View style={[styles.iconCircle, styles.iconCancelled]}>
            <Ionicons name="ban" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_created':
        return (
          <View style={[styles.iconCircle, styles.iconDefault]}>
            <Ionicons name="hourglass-outline" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_completed':
        return (
          <View style={[styles.iconCircle, styles.iconConfirmed]}>
            <Ionicons name="checkmark-done" size={20} color={Colors.white} />
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, styles.iconDefault]}>
            <Ionicons name="notifications" size={20} color={Colors.white} />
          </View>
        );
    }
  };

  const navigateForNotification = async (n: Notification) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      toast('Please log in to open this notification.', 'warning');
      return;
    }

    // Determine whether the logged-in user is a merchant
    const userStr = await AsyncStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isMerchant = user?.role === 'merchant' || user?.role === 'restaurant';
    const bookingsRoute = isMerchant ? '/(merchant-tabs)/bookings' : '/(tabs)/bookings';
    const returnTo = isMerchant ? 'merchant' : 'customer';

    const relatedId = n.related_id?.trim();
    if (!relatedId) {
      router.navigate(bookingsRoute as any);
      return;
    }

    setOpeningId(n.id);
    try {
      const { data: row } = await axios.get(
        `${API_CONFIG.BASE_URL}/api/reservations/${relatedId}`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
      );
      const base = reservationRowToBookingParams(row);
      const status = (row.status || '').toLowerCase();

      switch (n.type) {
        case 'booking_created':
          if (status === 'pending' || status === 'modified') {
            if (isMerchant) {
              router.navigate(bookingsRoute as any);
            } else {
              router.push({
                pathname: '/booking-waiting-confirmation',
                params: {
                  bookingId: base.bookingId,
                  name: base.name,
                  ref: base.ref,
                  date: base.date,
                  time: base.time,
                  guests: base.guests,
                  table: base.table,
                  bookingName: base.bookingName,
                  bookingEmail: base.bookingEmail,
                  address: base.address,
                },
              } as any);
            }
          } else if (status === 'confirmed' || status === 'arrived') {
            router.push({
              pathname: '/booking-confirmation',
              params: { ...base, initialStep: 'success', returnTo },
            } as any);
          } else {
            router.navigate(bookingsRoute as any);
          }
          break;
        case 'booking_confirmed':
        case 'booking_completed':
          router.push({
            pathname: '/booking-confirmation',
            params: { ...base, initialStep: 'success', returnTo },
          } as any);
          break;
        case 'booking_modified':
          router.navigate(bookingsRoute as any);
          break;
        case 'booking_rejected':
        case 'booking_cancelled':
          router.navigate(bookingsRoute as any);
          break;
        case 'booking_received':
          router.navigate('/(merchant-tabs)/bookings' as any);
          break;
        default:
          router.navigate(bookingsRoute as any);
      }
    } catch (e: any) {
      console.warn('Notification deep link failed:', e?.response?.data || e?.message);
      toast(
        e?.response?.status === 403
          ? 'You do not have access to this booking.'
          : 'Could not load booking details. Try Bookings.',
        'error'
      );
      router.navigate(bookingsRoute as any);
    } finally {
      setOpeningId(null);
    }
  };

  const onNotificationPress = async (n: Notification) => {
    await markAsRead(n.id);
    await navigateForNotification(n);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>{unreadCount} unread</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={styles.headerRightPlaceholder} />}
      </View>

      {/* Notification List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={Colors.gray} />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubText}>You'll get notifications about your bookings here</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((n) => (
            <View
              key={n.id}
              style={[
                styles.card,
                !n.is_read && styles.cardUnread,
              ]}
            >
              <View style={styles.cardRow}>
                <TouchableOpacity
                  style={styles.cardTapArea}
                  activeOpacity={0.8}
                  disabled={openingId === n.id}
                  onPress={() => onNotificationPress(n)}
                >
                  {getIcon(n.type)}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                    <Text style={styles.cardBody} numberOfLines={2}>{n.message}</Text>
                    <Text style={styles.cardTime}>{formatTime(n.created_at)}</Text>
                  </View>
                </TouchableOpacity>
                {openingId === n.id ? (
                  <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 6 }} />
                ) : (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => deleteNotification(n.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.gray} />
                  </TouchableOpacity>
                )}
              </View>
              {!n.is_read && <View style={styles.unreadDot} />}
            </View>
          ))}
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

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  markAllText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  headerRightPlaceholder: {
    width: 120,
    height: 28,
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 12,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },

  /* List */
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },

  /* Card */
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 16,
  },
  cardUnread: {
    backgroundColor: '#FDF6E0',
    borderColor: '#E5DBBD',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  /* Icon */
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  iconConfirmed: {
    backgroundColor: '#10b981',
  },
  iconRejected: {
    backgroundColor: '#ef4444',
  },
  iconModified: {
    backgroundColor: '#f59e0b',
  },
  iconCancelled: {
    backgroundColor: '#8b5cf6',
  },
  iconDefault: {
    backgroundColor: Colors.primary,
  },

  /* Card content */
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    marginBottom: 6,
  },
  cardTime: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
  },

  /* Delete button */
  deleteBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -4,
  },

  /* Unread dot */
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 12,
    right: 12,
  },
});
