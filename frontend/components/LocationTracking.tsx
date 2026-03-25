import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';

const API_URL = API_CONFIG.BASE_URL;

interface LocationTrackingProps {
  restaurantId: string;
  restaurantName: string;
}

interface RestaurantLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function LocationTracking({ restaurantId, restaurantName }: LocationTrackingProps) {
  const [restaurantLocation, setRestaurantLocation] = useState<RestaurantLocation | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<any>(null);

  useEffect(() => {
    initializeTracking();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [restaurantId]);

  const initializeTracking = async () => {
    try {
      await requestLocationPermission();
      await fetchRestaurantLocation();
      await getCurrentUserLocation();
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to initialize location tracking');
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for tracking');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const fetchRestaurantLocation = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/location/restaurant/${restaurantId}`);
      if (response.data.success) {
        setRestaurantLocation(response.data.location);
      }
    } catch (error) {
      console.error('Fetch location error:', error);
      Alert.alert('Error', 'Could not fetch restaurant location');
    }
  };

  const getCurrentUserLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const userLoc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(userLoc);

      if (restaurantLocation) {
        calculateDistance(userLoc, restaurantLocation);
      }
    } catch (error) {
      console.error('Get location error:', error);
    }
  };

  const calculateDistance = async (from: UserLocation, to: RestaurantLocation) => {
    try {
      const response = await axios.get(`${API_URL}/api/location/distance`, {
        params: {
          fromLat: from.latitude,
          fromLng: from.longitude,
          toLat: to.latitude,
          toLng: to.longitude,
        },
      });

      if (response.data.success) {
        setDistance(response.data.distance.kilometers);
      }
    } catch (error) {
      console.error('Distance calculation error:', error);
    }
  };

  const startTracking = async () => {
    try {
      setTracking(true);
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 20, // Or every 20 meters
        },
        (newLocation) => {
          const userLoc = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setUserLocation(userLoc);

          if (restaurantLocation) {
            calculateDistance(userLoc, restaurantLocation);
          }
        }
      );

      setLocationSubscription(subscription);
      Alert.alert('Tracking Started', `Tracking your location to ${restaurantName}`);
    } catch (error) {
      console.error('Tracking error:', error);
      Alert.alert('Error', 'Could not start location tracking');
      setTracking(false);
    }
  };

  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setTracking(false);
    Alert.alert('Tracking Stopped', 'Location tracking has been disabled');
  };

  const toggleTracking = () => {
    if (tracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  if (!restaurantLocation || !userLocation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Location data not available</Text>
      </View>
    );
  }

  const centerLat = (userLocation.latitude + restaurantLocation.latitude) / 2;
  const centerLng = (userLocation.longitude + restaurantLocation.longitude) / 2;

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Restaurant Marker */}
        <Marker
          coordinate={{
            latitude: restaurantLocation.latitude,
            longitude: restaurantLocation.longitude,
          }}
          title={restaurantName}
          description={restaurantLocation.address || 'Restaurant Location'}
          pinColor={Colors.primary}
        />

        {/* User Marker */}
        <Marker
          coordinate={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          }}
          title="Your Location"
          description="You are here"
          pinColor="#4CAF50"
        />

        {/* Route Line */}
        <Polyline
          coordinates={[userLocation, restaurantLocation]}
          strokeColor={Colors.primary}
          strokeWidth={2}
          lineDashPattern={[10, 5]}
        />
      </MapView>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.headerRow}>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
          <Ionicons
            name={'location'}
            size={20}
            color={tracking ? Colors.primary : '#999'}
          />
        </View>

        {distance !== null && (
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceLabel}>Distance to restaurant:</Text>
            <Text style={styles.distanceValue}>
              {distance.toFixed(2)} km
              {distance < 1 ? ` (${Math.round(distance * 1000)} meters)` : ''}
            </Text>
          </View>
        )}

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Restaurant Address:</Text>
          <Text style={styles.addressText}>{restaurantLocation.address || 'Address not available'}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.trackingButton,
            tracking && styles.trackingButtonActive,
          ]}
          onPress={toggleTracking}
        >
          <Ionicons
            name={tracking ? 'pause-circle' : 'play-circle'}
            size={20}
            color="white"
          />
          <Text style={styles.trackingButtonText}>
            {tracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      {tracking && (
        <View style={styles.trackingIndicator}>
          <View style={styles.pulsing} />
          <Text style={styles.trackingText}>Live Tracking Active</Text>
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
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 20,
  },
  infoCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  distanceContainer: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  distanceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  trackingButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  trackingButtonActive: {
    backgroundColor: Colors.primary,
  },
  trackingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  trackingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  pulsing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  trackingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
