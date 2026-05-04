/**
 * Example: Integration of Location Tracking in Booking Confirmation Page
 * File: frontend/app/booking-confirmation.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
// import LocationTracking from '@/components/LocationTracking'; // Disabled - requires native build
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

const API_URL = API_CONFIG.BASE_URL;

interface BookingData {
  restaurantId: string;
  restaurantName: string;
  bookingDate: string;
  bookingTime: string;
  guests: number;
  tableNumber: string;
}

export default function BookingConfirmationScreen() {
  const { toast, confirm } = useAppToast();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'location' | 'tracking'>('details');
  const [token, setToken] = useState('');

  useEffect(() => {
    loadBookingData();
  }, []);

  const loadBookingData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }

      const bookingData = {
        restaurantId: params.restaurantId as string,
        restaurantName: params.restaurantName as string,
        bookingDate: params.bookingDate as string,
        bookingTime: params.bookingTime as string,
        guests: parseInt(String(params.guests)) || 2,
        tableNumber: params.tableNumber as string,
      };

      setBooking(bookingData);
    } catch (error) {
      console.error('Failed to load booking data:', error);
    }
  };

  const handleCancelBooking = async () => {
    confirm('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', onPress: () => {} },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            // TODO: Call cancel API endpoint
            toast('Booking cancelled', 'success');
            router.back();
          } catch (error) {
            toast('Failed to cancel booking', 'error');
          }
        },
      },
    ]);
  };

  if (!booking) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'details' && styles.tabButtonActive]}
          onPress={() => setActiveTab('details')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'details' && styles.tabButtonTextActive,
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'location' && styles.tabButtonActive]}
          onPress={() => setActiveTab('location')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'location' && styles.tabButtonTextActive,
            ]}
          >
            Location
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tracking' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tracking')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'tracking' && styles.tabButtonTextActive,
            ]}
          >
            Track
          </Text>
        </TouchableOpacity>
      </View>

      {/* Booking Details Tab */}
      {activeTab === 'details' && (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Restaurant</Text>
            <Text style={styles.value}>{booking.restaurantName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{booking.bookingDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{booking.bookingTime}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Guests</Text>
            <Text style={styles.value}>{booking.guests} people</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Table</Text>
            <Text style={styles.value}>Table {booking.tableNumber}</Text>
          </View>

          <Text style={styles.confirmationMessage}>
            Your reservation is confirmed! Show your booking confirmation to the restaurant.
          </Text>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelBooking}>
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location Tab */}
      {activeTab === 'location' && (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Restaurant Location</Text>

          {/* Map disabled - requires native build */}
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>📍 Location Map Unavailable</Text>
          </View>

          <View style={styles.addressCard}>
            <Text style={styles.addressTitle}>Address</Text>
            <Text style={styles.addressText}>123 Main St, San Francisco, CA 94102</Text>
          </View>
        </View>
      )}

      {/* Location Tracking Tab */}
      {activeTab === 'tracking' && (
        <View style={[styles.tabContent, { paddingBottom: 0 }]}>
          <Text style={styles.sectionTitle}>Location Tracking</Text>

          <View style={styles.trackingPlaceholder}>
            <Text style={styles.trackingPlaceholderText}>📍 Open in Maps App</Text>
            <Text style={styles.trackingPlaceholderSub}>Location tracking is available in Google Maps</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  confirmationMessage: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    color: '#2e7d32',
    fontSize: 14,
    lineHeight: 20,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderColor: '#d32f2f',
    borderWidth: 1.5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  trackingPlaceholder: {
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  trackingPlaceholderText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  trackingPlaceholderSub: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addressCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  addressTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
