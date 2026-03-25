/**
 * Example: Merchant Location Update Page
 * File: frontend/screens/Merchant/UpdateLocationScreen.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import LocationPicker from '@/components/LocationPicker';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';

const API_URL = API_CONFIG.BASE_URL;

interface RestaurantLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export default function UpdateLocationScreen() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState('');
  const [currentLocation, setCurrentLocation] = useState<RestaurantLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const merchantData = await AsyncStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
      }

      if (merchantData) {
        const user = JSON.parse(merchantData);
        // Assuming restaurant ID is stored in user data
        if (user.restaurants && user.restaurants.length > 0) {
          const firstRestaurant = user.restaurants[0];
          setRestaurantId(firstRestaurant.id);
          if (storedToken) {
            await fetchCurrentLocation(firstRestaurant.id, storedToken);
          }
        }
      }
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentLocation = async (resId: string, authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/location/restaurant/${resId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.data.success) {
        setCurrentLocation(response.data.location);
      }
    } catch (error) {
      console.warn('Could not fetch current location:', error);
      // Location might not exist yet, which is fine
    }
  };

  const handleLocationSelected = async (selectedLocation: RestaurantLocation) => {
    try {
      setSaving(true);

      const response = await axios.patch(
        `${API_URL}/api/location/restaurant/${restaurantId}`,
        {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: selectedLocation.address,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setCurrentLocation(selectedLocation);
        Alert.alert('Success', 'Restaurant location updated successfully!');
        router.back();
      }
    } catch (error) {
      console.error('Update error:', error);
      let errorMessage = 'Failed to update location';

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  if (!restaurantId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No restaurant found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} scrollEnabled={false}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Update Restaurant Location</Text>
          <Text style={styles.subtitle}>
            Select or update your restaurant location on the map
          </Text>
        </View>

        {currentLocation && (
          <View style={styles.currentLocationCard}>
            <Text style={styles.currentLocationTitle}>Current Location</Text>
            <Text style={styles.currentLocationText}>
              {currentLocation.address || 'Address not set'}
            </Text>
            <Text style={styles.coordinates}>
              Lat: {currentLocation.latitude.toFixed(4)}, Lng: {currentLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        <LocationPicker
          onLocationSelected={handleLocationSelected}
          initialLocation={currentLocation || undefined}
        />
      </ScrollView>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.savingText}>Saving location...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  currentLocationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  currentLocationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  currentLocationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  coordinates: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  savingText: {
    marginTop: 12,
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
});
