import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RestaurantLocation {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

interface RestaurantMapProps {
  location: RestaurantLocation;
  height?: number;
  showFullScreen?: boolean;
  onFullScreenToggle?: (isFullScreen: boolean) => void;
}

export default function RestaurantMap({
  location,
  height = 300,
  showFullScreen = false,
  onFullScreenToggle,
}: RestaurantMapProps) {
  const [loading, setLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(showFullScreen);

  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      setLoading(false);
    }
  }, [location]);

  const handleFullScreen = () => {
    const newState = !isFullScreen;
    setIsFullScreen(newState);
    onFullScreenToggle?.(newState);
  };

  if (!location?.latitude || !location?.longitude) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.errorText}>Location not available</Text>
      </View>
    );
  }

  const mapHeight = isFullScreen ? Dimensions.get('window').height : height;

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ width: '100%', height: '100%' }}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        }}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title={location.name || 'Restaurant Location'}
          description={location.address || ''}
          pinColor={Colors.primary}
        />
      </MapView>

      {!isFullScreen && (
        <TouchableOpacity
          style={styles.fullScreenButton}
          onPress={handleFullScreen}
          activeOpacity={0.7}
        >
          <Ionicons name="expand" size={20} color="white" />
          <Text style={styles.buttonText}>View Full Map</Text>
        </TouchableOpacity>
      )}

      {isFullScreen && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleFullScreen}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 100,
  },
  fullScreenButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
