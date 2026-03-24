import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

/* ── Types ── */

type BookingStatus = 'Upcoming' | 'Past' | 'Cancelled';

type Booking = {
  id: string;
  name: string;
  ref: string;
  date: string;
  time: string;
  guests: number;
  table?: number;
  status: BookingStatus;
  image: ImageSourcePropType;
  tags?: string;
  address?: string;
};

const TABS = ['Upcoming', 'Past', 'Cancelled / Modified'] as const;

const BOOKINGS: Booking[] = [
  {
    id: 'b1',
    name: 'Sakura Sushi Bar',
    ref: 'RRA-ZZV3S',
    date: '2026-03-09',
    time: '2:30pm',
    guests: 1,
    table: 1,
    status: 'Upcoming',
    image: require('@/assets/restaurant-3.jpg'),
    tags: 'Japanese Cuisine • Sushi Bar',
    address: '12 Kingsway, London',
  },
  {
    id: 'b2',
    name: 'Romeo Lane',
    ref: 'RRA-B1A72',
    date: '2026-03-15',
    time: '7:30pm',
    guests: 4,
    table: 12,
    status: 'Upcoming',
    image: require('@/assets/restaurant-1.jpg'),
    tags: 'Crafted Cocktails • Gourmet Cuisine • Best Bar',
    address: '7 Bell Yard, Holborn',
  },
  {
    id: 'b3',
    name: 'Sakura Sushi Bar',
    ref: 'RRA-C9K41',
    date: '2026-03-10',
    time: '8:00pm',
    guests: 2,
    table: 5,
    status: 'Past',
    image: require('@/assets/restaurant-3.jpg'),
  },
  {
    id: 'b4',
    name: 'Bella Trattoria',
    ref: 'RRA-M5Q88',
    date: '2026-03-08',
    time: '6:30pm',
    guests: 6,
    status: 'Cancelled',
    image: require('@/assets/restaurant-2.jpg'),
  },
];

/* ── Component ── */

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const router = useRouter();

  const tabStatusMap: Record<number, BookingStatus[]> = {
    0: ['Upcoming'],
    1: ['Past'],
    2: ['Cancelled'],
  };

  const filtered = BOOKINGS.filter((b) =>
    tabStatusMap[activeTab]?.includes(b.status)
  );

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'Upcoming':
        return Colors.primary;
      case 'Past':
        return '#B8960C';
      case 'Cancelled':
        return Colors.accent;
    }
  };

  const handleModify = (booking: Booking) => {
    router.push({
      pathname: '/modify-booking',
      params: {
        id: booking.id,
        name: booking.name,
        ref: booking.ref,
        date: booking.date,
        time: booking.time,
        guests: String(booking.guests),
        table: String(booking.table ?? 0),
        tags: booking.tags ?? '',
        address: booking.address ?? '',
      },
    } as any);
  };

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking at ${booking.name}?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.heading}>Booking History</Text>
      <Text style={styles.subHeading}>Manage your reservations</Text>

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

      {filtered.map((booking) => (
        <View key={booking.id} style={styles.bookingCard}>
          {/* Top section */}
          <View style={styles.bookingTop}>
            <Image source={booking.image} style={styles.bookingImage} />
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
          {booking.status === 'Upcoming' && (
            <View style={styles.bookingActions}>
              <TouchableOpacity
                style={styles.modifyBtn}
                onPress={() => handleModify(booking)}
              >
                <Text style={styles.modifyText}>Modify</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(booking)}
              >
                <Ionicons name="close" size={16} color={Colors.accent} />
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {booking.status === 'Past' && (
            <TouchableOpacity style={styles.reviewBtn}>
              <Text style={styles.reviewText}>Leave Review</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
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
});
