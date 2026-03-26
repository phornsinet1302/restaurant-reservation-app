import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
// import LocationTracking from '@/components/LocationTracking'; // Disabled - requires native build

/* ── Helpers ── */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* Map restaurant names to images */
const IMAGE_MAP: Record<string, any> = {
  'Romeo Lane': require('@/assets/restaurant-1.jpg'),
  'SkyLounge Bar': require('@/assets/restaurant-2.jpg'),
  'Sakura Sushi Bar': require('@/assets/restaurant-3.jpg'),
  'Pret A Manger': require('@/assets/restaurant-4.jpg'),
};

/* ── Component ── */

export default function BookingConfirmationScreen() {
  const params = useLocalSearchParams<{
    id?: string;
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
    specialRequests: string;
  }>();
  const router = useRouter();
  const [showTracking, setShowTracking] = useState(false);

  const image = IMAGE_MAP[params.name ?? ''] ?? require('@/assets/restaurant-1.jpg');
  const bookingId = params.bookingId || params.id || '';

  const details = [
    { icon: 'pricetag-outline' as const, label: 'Reference', value: params.ref },
    { icon: 'calendar-outline' as const, label: 'Date', value: formatDate(params.date ?? '') },
    { icon: 'time-outline' as const, label: 'Time', value: params.time },
    { icon: 'people-outline' as const, label: 'Guests', value: `${params.guests} Guest${Number(params.guests) > 1 ? 's' : ''}` },
    { icon: 'grid-outline' as const, label: 'Table', value: `Table ${params.table}` },
    { icon: 'person-outline' as const, label: 'Name', value: params.bookingName },
    { icon: 'mail-outline' as const, label: 'Email', value: params.bookingEmail },
    { icon: 'location-outline' as const, label: 'Location', value: params.address },
  ];

  const handleNext = () => {
    // Navigate to waiting confirmation screen
    router.push({
      pathname: '/booking-waiting-confirmation',
      params: {
        bookingId,
        name: params.name,
        ref: params.ref,
        date: params.date,
        time: params.time,
        guests: params.guests,
        table: params.table,
        bookingName: params.bookingName,
        bookingEmail: params.bookingEmail,
        address: params.address,
      },
    } as any);
  };

  return (
    showTracking ? (
      <View style={styles.trackingContainer}>
        <View style={styles.trackingHeader}>
          <TouchableOpacity onPress={() => setShowTracking(false)}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.trackingTitle}>Location Tracking</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.trackingPlaceholder}>
          <Ionicons name="location" size={48} color={Colors.primary} />
          <Text style={styles.trackingPlaceholderText}>📍 Open in Maps App</Text>
          <Text style={styles.trackingPlaceholderSub}>Location tracking is available in Google Maps</Text>
        </View>
      </View>
    ) : (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Success icon */}
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark-circle" size={64} color="#2BA15C" />
        </View>

        <Text style={styles.title}>Booking Updated!</Text>
        <Text style={styles.subtitle}>
          Your reservation has been updated successfully
        </Text>

        {/* Confirmation card */}
        <View style={styles.card}>
          {/* Restaurant image header */}
          <View style={styles.imageWrapper}>
            <Image source={image} style={styles.restaurantImage} />
            <View style={styles.imageOverlay} />
            <Text style={styles.restaurantName}>{params.name}</Text>
          </View>

          {/* Detail rows */}
          {details.map((item, idx) => (
            <View key={idx} style={styles.detailRow}>
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={18} color={Colors.primary} />
              </View>
              <View style={styles.detailTexts}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            </View>
          ))}

          {/* Special requests */}
          {params.specialRequests ? (
            <View style={styles.specialBox}>
              <Text style={styles.specialLabel}>Special Requests</Text>
              <Text style={styles.specialValue}>{params.specialRequests}</Text>
            </View>
          ) : null}
        </View>

        {/* Track Location Button */}
        <TouchableOpacity
          style={styles.trackBtn}
          activeOpacity={0.8}
          onPress={() => setShowTracking(true)}
        >
          <Ionicons name="location" size={20} color={Colors.primary} />
          <Text style={styles.trackBtnText}>Track to Restaurant</Text>
        </TouchableOpacity>

        {/* Done button */}
        <TouchableOpacity
          style={styles.doneBtn}
          activeOpacity={0.8}
          onPress={handleNext}
        >
          <Text style={styles.doneBtnText}>Confirm Booking</Text>
        </TouchableOpacity>

        {/* Skip button - Go to bookings */}
        <TouchableOpacity
          style={styles.skipBtn}
          activeOpacity={0.8}
          onPress={() => router.replace('/(tabs)/bookings' as any)}
        >
          <Text style={styles.skipBtnText}>Skip to Bookings</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 50,
    alignItems: 'center',
  },

  /* Success */
  checkCircle: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 26,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 28,
  },

  /* Card */
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    marginBottom: 28,
  },
  imageWrapper: {
    height: 140,
    justifyContent: 'flex-end',
  },
  restaurantImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  restaurantName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: '#FFF',
    padding: 18,
  },

  /* Detail rows */
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailTexts: {
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
    fontSize: 16,
    color: Colors.text,
  },

  /* Special requests */
  specialBox: {
    margin: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FDF6E0',
  },
  specialLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
  },
  specialValue: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },

  /* Track button */
  trackBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  trackBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.primary,
  },

  /* Tracking view */
  trackingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  trackingTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },

  trackingPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  trackingPlaceholderText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  trackingPlaceholderSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },

  /* Done button */
  doneBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  doneBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
  },

  /* Skip button */
  skipBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  skipBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: Colors.gray,
  },
});

