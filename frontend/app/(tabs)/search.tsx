import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import GuestLoginModal from '@/components/GuestLoginModal';

const FILTERS = [
  { id: 'all', emoji: '🔍', label: 'All' },
  { id: 'restaurants', emoji: '🍽️', label: 'Restaurants' },
  { id: 'pubs', emoji: '🍺', label: 'Pubs' },
  { id: 'cafe', emoji: '☕', label: 'Café' },
];

import { API_CONFIG } from '@/app/config/apiConfig';

const API_URL = API_CONFIG.BASE_URL;

type Restaurant = {
  id: string;
  name: string;
  address?: string;
  description?: string;
  rating?: number;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  hours?: string;
  opening_hours?: string;
};

export default function SearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');
  const [toggleLoading, setToggleLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isGuest } = useAuth();
  const router = useRouter();

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (userLat: number, userLon: number, restLat: number, restLon: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (restLat - userLat) * (Math.PI / 180);
    const dLon = (restLon - userLon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLat * (Math.PI / 180)) * Math.cos(restLat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Format distance for display
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `${meters}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  };

  // Request location permission and get location
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await getCurrentLocation();
      } else {
        console.log('Location permission denied');
        setLocationError('Location permission denied');
        setUserLocation({ latitude: 11.5564, longitude: 104.9282 });
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationError('Failed to request location permission');
      setUserLocation({ latitude: 11.5564, longitude: 104.9282 });
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setLocationError(null);
      await AsyncStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Failed to get current location');
      setUserLocation({ latitude: 11.5564, longitude: 104.9282 });
    }
  };

  // Load favorites and fetch initial restaurants on mount
  useEffect(() => {
    loadFavoritesAndToken();
    // Set default location immediately for distance calculation
    setUserLocation({ latitude: 11.5564, longitude: 104.9282 });
    requestLocationPermission();
    fetchRestaurants('');
  }, []);

  const loadFavoritesAndToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        await fetchFavorites(storedToken);
      }
    } catch (error) {
      console.warn('Failed to load favorites:', error);
    }
  };

  const fetchFavorites = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const favoriteIds = response.data.map((fav: any) => fav.restaurant_id);
      setFavorites(favoriteIds);
    } catch (error) {
      console.warn('Failed to fetch favorites:', error);
    }
  };

  const handleToggleFavorite = async (restaurantId: string, restaurantName: string) => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }

    if (!token) {
      Alert.alert('Error', 'You must be logged in to favorite restaurants');
      return;
    }

    setToggleLoading(true);
    try {
      const isFavorited = favorites.includes(restaurantId);

      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${API_URL}/api/favorites/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavorites((prev) => prev.filter((id) => id !== restaurantId));
      } else {
        // Add to favorites
        await axios.post(
          `${API_URL}/api/favorites/${restaurantId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFavorites((prev) => [...prev, restaurantId]);
      }
    } catch (error: any) {
      console.error('Favorite toggle error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    } finally {
      setToggleLoading(false);
    }
  };

  // Fetch restaurants based on search term
  const fetchRestaurants = async (query: string, retryCount = 0) => {
    try {
      setLoading(true);
      setError('');
      
      let url = `${API_URL}/api/restaurants`;
      if (query && query.length > 0) {
        url += `?search=${encodeURIComponent(query)}`;
      }
      
      console.log('🔍 Fetching from:', url, retryCount > 0 ? `(Retry ${retryCount})` : '');
      // Increased timeout from 10s to 30s to handle network latency
      const response = await axios.get(url, { timeout: 30000 });
      console.log('✅ Response received:', response.data);

      // Calculate distances for each restaurant and map opening_hours to hours
      let restaurantsWithDistance = response.data || [];
      if (userLocation && restaurantsWithDistance.length > 0) {
        restaurantsWithDistance = restaurantsWithDistance.map((restaurant: Restaurant) => {
          let distance = 'Unknown';
          
          // Calculate distance if restaurant has coordinates
          if (restaurant.latitude && restaurant.longitude) {
            const distanceKm = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              restaurant.latitude,
              restaurant.longitude
            );
            distance = formatDistance(distanceKm);
          }
          
          return {
            ...restaurant,
            distance: distance,
            hours: restaurant.opening_hours || 'Check hours',
          };
        });
      } else {
        // Set default values if no user location
        restaurantsWithDistance = restaurantsWithDistance.map((restaurant: Restaurant) => ({
          ...restaurant,
          distance: 'Unknown',
          hours: restaurant.opening_hours || 'Check hours',
        }));
      }

      console.log('🔍 [SearchScreen] Loaded restaurants with distances:', restaurantsWithDistance.map((r: any) => ({ 
        id: r.id, 
        name: r.name,
        distance: r.distance,
        hours: r.hours,
      })));

      setRestaurants(restaurantsWithDistance);
    } catch (err: any) {
      console.error('❌ Search error:', err.message);
      console.error('❌ Error details:', err.response?.data || err);
      
      // Check if it's a timeout error and retry
      if (err.code === 'ECONNABORTED' && retryCount < 2) {
        console.log('⏱️ Timeout occurred, retrying... (' + (retryCount + 1) + '/2)');
        // Wait 2 seconds before retrying
        await new Promise(r => setTimeout(r, 2000));
        return fetchRestaurants(query, retryCount + 1);
      }
      
      // Provide user-friendly error message
      if (err.code === 'ECONNABORTED') {
        setError('Network request took too long. Please check your connection and try again.');
      } else if (err.message.includes('Network') || err.code === 'ECONNREFUSED') {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError('Unable to load restaurants. Please try again.');
      }
      
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length > 0) {
        fetchRestaurants(searchTerm);
      } else {
        fetchRestaurants('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reload restaurants when location changes
  useEffect(() => {
    if (userLocation && searchTerm.length >= 0) {
      if (searchTerm.length > 0) {
        fetchRestaurants(searchTerm);
      } else {
        fetchRestaurants('');
      }
    }
  }, [userLocation]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search restaurants</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location..."
          placeholderTextColor={Colors.gray}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close" size={18} color={Colors.gray} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterPill,
              activeFilter === f.id && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text
              style={[
                styles.filterLabel,
                activeFilter === f.id && styles.filterLabelActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Error message */}
      {error && !loading && (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* No results */}
      {!loading && restaurants.length === 0 && searchTerm && (
        <View style={styles.centerContent}>
          <Ionicons name="search" size={48} color={Colors.gray} style={{ marginBottom: 12 }} />
          <Text style={styles.noResultsText}>No restaurants found</Text>
          <Text style={styles.noResultsSubText}>Try searching with different keywords</Text>
        </View>
      )}

      {/* Count text */}
      {!loading && restaurants.length > 0 && (
        <Text style={styles.countText}>Found {restaurants.length} restaurant(s)</Text>
      )}

      {/* Cards */}
      {restaurants.map((r: any) => (
        <TouchableOpacity
          key={r.id}
          style={styles.card}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '../restaurant-detail',
              params: {
                id: r.id,
                name: r.name,
                rating: r.rating || '4.5',
                reviews: '3.2k',
                address: r.address || 'No address provided',
                description: r.description || 'No description',
                hours: r.hours || 'Check hours',
                distance: r.distance || 'Unknown',
              },
            } as any)
          }
        >
          {/* Image with rating badge */}
          <View style={styles.cardImageWrapper}>
            {r.image_url ? (
              <Image source={{ uri: r.image_url }} style={styles.cardImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="restaurant" size={48} color={Colors.gray} />
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#FFFBF0" />
              <Text style={styles.ratingText}>{r.rating || '4.5'}</Text>
            </View>
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.nameCol}>
              <Text style={styles.cardName} numberOfLines={1}>{r.name}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => handleToggleFavorite(r.id, r.name)}
                disabled={toggleLoading}
              >
                <Ionicons
                  name={favorites.includes(r.id) ? 'heart' : 'heart-outline'}
                  size={22}
                  color={favorites.includes(r.id) ? Colors.accent : Colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailsBtn}>
                <Text style={styles.detailsBtnText}>Details</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.gray} />
              <Text style={styles.metaText}>{r.hours || 'Check hours'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.gray} />
              <Text style={styles.metaText}>{r.distance || 'Unknown'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      </ScrollView>

      <GuestLoginModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        feature="Favorites"
      />
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
    paddingTop: 60,
    paddingBottom: 30,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },

  /* Search */
  searchBox: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F5EFDC',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.text,
    fontSize: 14,
  },

  /* Filters */
  filtersRow: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterPillActive: {
    backgroundColor: '#FDF6E0',
    borderColor: Colors.primary,
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  filterLabelActive: {
    color: Colors.primary,
  },

  /* Count */
  countText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  /* Card */
  card: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  cardImageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightGray || '#F5EFDC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(47, 37, 24, 0.70)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ratingText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: '#FFFBF0',
  },

  /* Card info */
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  nameCol: {
    flex: 1,
  },
  cardName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  detailsBtnText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },

  /* Center content for loading/error/empty states */
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: Colors.text,
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
  noResultsText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 12,
  },
  noResultsSubText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
  },
});
