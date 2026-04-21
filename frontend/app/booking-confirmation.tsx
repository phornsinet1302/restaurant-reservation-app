import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';
// import LocationTracking from '@/components/LocationTracking'; // Disabled - requires native build

/* ── Helpers ── */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(dateStr: string) {
  if (!dateStr) return 'Date not set';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date';
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

type BookingStep = 'detail' | 'success';

export default function BookingConfirmationScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    bookingId?: string;
    reservationId?: string;
    name: string;
    ref: string;
    date: string;
    time: string;
    guests: string;
    table: string;
    restaurantId: string;
    tableId: string;
    bookingName: string;
    bookingEmail: string;
    address: string;
    specialRequests: string;
  }>();
  const { toast } = useAppToast();
  const router = useRouter();
  const [showTracking, setShowTracking] = useState(false);
  const [step, setStep] = useState<BookingStep>('detail');
  const [loading, setLoading] = useState(false);
  const [confirmationId, setConfirmationId] = useState('');

  const image = IMAGE_MAP[params.name ?? ''] ?? require('@/assets/restaurant-1.jpg');
  const bookingId = params.bookingId || params.id || '';
  const reservationId = params.reservationId || ''; // Get reservation ID for updates
  const isUpdating = !!reservationId && reservationId.trim().length > 0;

  const details = [
    { icon: 'pricetag-outline' as const, label: 'Reference', value: params.ref || 'N/A' },
    { icon: 'calendar-outline' as const, label: 'Date', value: formatDate(params.date ?? '') },
    { icon: 'time-outline' as const, label: 'Time', value: params.time || 'N/A' },
    { icon: 'people-outline' as const, label: 'Guests', value: `${params.guests || '0'} Guest${Number(params.guests) > 1 ? 's' : ''}` },
    { icon: 'grid-outline' as const, label: 'Table', value: `Table ${params.table || 'N/A'}` },
    { icon: 'person-outline' as const, label: 'Name', value: params.bookingName || 'N/A' },
    { icon: 'mail-outline' as const, label: 'Email', value: params.bookingEmail || 'N/A' },
    { icon: 'location-outline' as const, label: 'Location', value: params.address || 'N/A' },
  ];

  // CREATE OR UPDATE BOOKING API CALL
  const handleConfirmBooking = async () => {
    try {
      setLoading(true);

      // Validate required fields before attempting booking
      if (!params.bookingName?.trim()) {
        toast('Customer name is required for the booking', 'warning');
        setLoading(false);
        return;
      }

      if (!params.bookingEmail?.trim()) {
        toast('Customer email is required for the booking', 'warning');
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('token');

      if (isUpdating) {
        // UPDATE EXISTING BOOKING
        console.log('✏️ [DEBUG] Updating booking with:', {
          reservation_id: reservationId,
          table_id: params.tableId,
          reservation_date: params.date,
          reservation_time: params.time,
          party_size: params.guests,
          special_request: params.specialRequests,
        });

        const response = await axios.patch(
          `${API_CONFIG.BASE_URL}/api/reservations/${reservationId}/update`,
          {
            table_id: params.tableId,
            reservation_date: params.date,
            reservation_time: params.time,
            party_size: Number(params.guests),
            special_request: params.specialRequests?.trim() || '',
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        console.log('✅ [DEBUG] Booking updated successfully:', response.data);
        const updatedBookingId = response.data[0]?.id || reservationId;
        setConfirmationId(updatedBookingId);
        toast('Booking updated successfully!', 'success');
        
        // Show success screen
        setStep('success');
        setLoading(false);

      } else {
        // CREATE NEW BOOKING
        console.log('📝 [DEBUG] Creating new booking with:', {
          restaurant_id: params.restaurantId,
          table_id: params.tableId,
          reservation_date: params.date,
          reservation_time: params.time,
          party_size: params.guests,
          customer_name: params.bookingName,
          customer_email: params.bookingEmail,
          special_request: params.specialRequests,
        });

        const response = await axios.post(
          `${API_CONFIG.BASE_URL}/api/reservations`,
          {
            restaurant_id: params.restaurantId,
            table_id: params.tableId,
            reservation_date: params.date,
            reservation_time: params.time,
            party_size: Number(params.guests),
            customer_name: params.bookingName?.trim(),
            customer_email: params.bookingEmail?.trim(),
            special_request: params.specialRequests?.trim() || '',
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        console.log('✅ [DEBUG] Booking created successfully:', response.data);
        const newBookingId = response.data.id || bookingId;
        setConfirmationId(newBookingId);
        
        // Show success screen
        setStep('success');
        setLoading(false);
      }

    } catch (error: any) {
      console.error('❌ [DEBUG] Booking operation failed:', error.response?.data || error.message);
      const errorMsg = isUpdating ? 'Failed to update booking' : 'Failed to create booking';
      toast(`${errorMsg}: ${error.response?.data?.error || error.message}`, 'error');
      setLoading(false);
    }
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
    ) : step === 'detail' ? (
      // 📋 BOOKING DETAIL SCREEN - Review and Confirm/Cancel
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.detailIcon}>
          <Ionicons name="document-text-outline" size={64} color={Colors.primary} />
        </View>

        <Text style={styles.detailTitle}>Review Your Booking</Text>
        <Text style={styles.detailSubtitle}>
          Please check the booking details below
        </Text>

        {/* Booking Details Card */}
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

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.doneBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.doneBtnText}>Confirm</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button - Go Back */}
        <TouchableOpacity
          style={[styles.cancelBookingBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelBookingBtnText}>❌ Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    ) : step === 'success' ? (
      // ✅ SUCCESS SCREEN
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#2BA15C" />
        </View>
        
        <Text style={styles.successTitle}>🎉 Thank you for Booking!</Text>
        <Text style={styles.successSubtitle}>Your reservation at {params.name} is confirmed</Text>
        
        <View style={styles.successCard}>
          <Text style={styles.successCardTitle}>Confirmation ID</Text>
          <Text style={styles.confirmationId}>{confirmationId || bookingId}</Text>
          <Text style={styles.successCardText}>📧 Confirmation email sent to {params.bookingEmail}</Text>
          <Text style={styles.successCardText}>🔔 Notifications enabled</Text>
        </View>
        
        <View style={styles.successDetails}>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Date</Text>
            <Text style={styles.successValue}>{formatDate(params.date ?? '')}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Time</Text>
            <Text style={styles.successValue}>{params.time}</Text>
          </View>
          <View style={styles.successRow}>
            <Text style={styles.successLabel}>Guests</Text>
            <Text style={styles.successValue}>{params.guests}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.skipBtn} activeOpacity={0.8} onPress={() => router.replace('/(tabs)/bookings' as any)}>
          <Text style={styles.skipBtnText}>Back to Bookings</Text>
        </TouchableOpacity>
      </ScrollView>
    ) : null
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

  /* Cancel Booking Button */
  cancelBookingBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginTop: 12,
  },
  cancelBookingBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: '#FF6B6B',
  },

  /* Detail Step Styles */
  detailIcon: {
    marginBottom: 16,
  },
  detailTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  detailSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 28,
  },

  /* Success Screen Styles */
  successIcon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  successCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  successCardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 8,
  },
  confirmationId: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.primary,
    marginBottom: 12,
  },
  successCardText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  successDetails: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  successLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },
  successValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: Colors.text,
  },
});


