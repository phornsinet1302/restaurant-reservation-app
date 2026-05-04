import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

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

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Success checkmark icon */}
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={56} color="#2BA15C" />
        </View>
      </View>

      {/* Thank you message */}
      <Text style={styles.title}>Thank You for Your Booking!</Text>
      <Text style={styles.subtitle}>
        Your reservation request has been submitted to the restaurant. You can view it in your Bookings.
      </Text>

      {/* Receipt Card */}
      <View style={styles.receiptCard}>
        {/* Header */}
        <View style={styles.receiptHeader}>
          <Text style={styles.receiptTitle}>Booking Receipt</Text>
          <Text style={styles.referenceCode}>{params.ref}</Text>
        </View>

        <View style={styles.receiptDivider} />

        {/* Restaurant */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Restaurant</Text>
          <Text style={styles.receiptValue}>{params.name}</Text>
        </View>

        {/* Date & Time */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Date & Time</Text>
          <Text style={styles.receiptValue}>
            {params.date} at {formatTime(params.time)}
          </Text>
        </View>

        {/* Party Size */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Number of Guests</Text>
          <Text style={styles.receiptValue}>{params.guests} guest(s)</Text>
        </View>

        {/* Table */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Preferred Table</Text>
          <Text style={styles.receiptValue}>Table {params.table}</Text>
        </View>

        {/* Customer Name */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Booking Name</Text>
          <Text style={styles.receiptValue}>{params.bookingName}</Text>
        </View>

        {/* Customer Email */}
        <View style={styles.receiptRow}>
          <Text style={styles.receiptLabel}>Email</Text>
          <Text style={styles.receiptValue}>{params.bookingEmail}</Text>
        </View>

        <View style={styles.receiptDivider} />

        {/* Status */}
        <View style={styles.statusBox}>
          <Ionicons name="time" size={16} color={Colors.primary} />
          <Text style={styles.statusText}>Awaiting Confirmation</Text>
        </View>
      </View>

      {/* Info message */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#2BA15C" />
        <Text style={styles.infoText}>
          The restaurant will review your booking and send you a confirmation or alternative options.
        </Text>
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.viewBookingsBtn}
        onPress={() => router.push('/(tabs)/bookings')}
      >
        <Ionicons name="calendar" size={20} color="white" />
        <Text style={styles.viewBookingsBtnText}>View in Bookings</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => router.push('/(tabs)')}
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  successContainer: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F8EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2BA15C',
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
    marginBottom: 28,
    lineHeight: 20,
  },
  receiptCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    marginBottom: 16,
  },
  receiptTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  referenceCode: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  receiptRow: {
    marginBottom: 12,
  },
  receiptLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 4,
  },
  receiptValue: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  infoBox: {
    backgroundColor: '#F0F8F4',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2BA15C',
    padding: 14,
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
  viewBookingsBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  viewBookingsBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: 'white',
  },
  homeBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  homeBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.primary,
  },
});
