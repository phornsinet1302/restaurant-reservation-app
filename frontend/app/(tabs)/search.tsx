import React, { useState, useEffect, useRef } from 'react';
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
  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useAppToast } from '@/components/ToastProvider';

const API_URL = API_CONFIG.BASE_URL;

type Restaurant = {
  id: string;
  name: string;
  address?: string;
  description?: string;
  rating?: number | string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  hours?: string;
  opening_hours?: string;
  category?: string;
  reviews_count?: number;
};

const formatRestaurantRating = (rating: unknown): string => {
  const parsed =
    typeof rating === 'number'
      ? rating
      : typeof rating === 'string'
        ? Number.parseFloat(rating)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(1) : 'New';
};

const formatReviewsCount = (count: unknown): string => {
  const parsed =
    typeof count === 'number'
      ? count
      : typeof count === 'string'
        ? Number.parseInt(count, 10)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : '0';
};

export default function SearchScreen() {
  const { toast } = useAppToast();
  const insets = useSafeAreaInsets();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { isGuest } = useAuth();
  const requestSeqRef = useRef(0);
  const latestAppliedSeqRef = useRef(0);
  const inFlightKeyRef = useRef<string | null>(null);
  const activeRequestSeqRef = useRef(0);
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
    const fallback = { latitude: 11.5564, longitude: 104.9282 };
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        console.warn('⚠️ Location services disabled — using default location');
        setUserLocation(fallback);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      setLocationError(null);
      await AsyncStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
    } catch (error) {
      console.warn('⚠️ Could not get location — using default:', error);
      setLocationError('Failed to get current location');
      setUserLocation(fallback);
    }
  };

  // Load favorites and fetch initial restaurants on mount
  useEffect(() => {
    loadFavoritesAndToken();
    // Set default location immediately for distance calculation
    setUserLocation({ latitude: 11.5564, longitude: 104.9282 });
    requestLocationPermission();
    // Don't fetch here - wait for location to be set via useEffect below
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
      toast('You must be logged in to favorite restaurants', 'error');
      return;
    }

    setFavoriteLoadingId(restaurantId);
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
      toast('Failed to update favorite. Please try again.', 'error');
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  // Fetch restaurants based on search term
  const fetchRestaurants = async (query: string, retryCount = 0) => {
    const locationKey = userLocation
      ? `${userLocation.latitude.toFixed(4)},${userLocation.longitude.toFixed(4)}`
      : 'no-location';
    const requestKey = `${query.trim().toLowerCase()}|${locationKey}|retry:${retryCount}`;
    if (retryCount === 0 && inFlightKeyRef.current === requestKey) {
      return;
    }

    const seq = ++requestSeqRef.current;
    activeRequestSeqRef.current = seq;
    inFlightKeyRef.current = requestKey;
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
            rating: formatRestaurantRating(restaurant.rating),
            reviews_count: typeof restaurant.reviews_count === 'number' ? restaurant.reviews_count : 0,
            distance: distance,
            hours: restaurant.opening_hours || 'Check hours',
          };
        });
      } else {
        // Set default values if no user location
        restaurantsWithDistance = restaurantsWithDistance.map((restaurant: Restaurant) => ({
          ...restaurant,
          rating: formatRestaurantRating(restaurant.rating),
          reviews_count: typeof restaurant.reviews_count === 'number' ? restaurant.reviews_count : 0,
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

      // Ignore stale responses from older requests
      if (seq < latestAppliedSeqRef.current) return;
      latestAppliedSeqRef.current = seq;
      setRestaurants(restaurantsWithDistance);
    } catch (err: any) {
      console.error('❌ Search error:', err.message);
      console.error('❌ Error details:', err.response?.data || err);
      
      // Check if it's a timeout error and retry
      if (err.code === 'ECONNABORTED' && retryCount < 2) {
        console.log('⏱️ Timeout occurred, retrying... (' + (retryCount + 1) + '/2)');
        // Wait 2 seconds before retrying
        await new Promise(r => setTimeout(r, 2000));
        inFlightKeyRef.current = null;
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
      
      if (seq >= latestAppliedSeqRef.current) {
        latestAppliedSeqRef.current = seq;
        setRestaurants([]);
      }
    } finally {
      if (seq === activeRequestSeqRef.current) {
        setLoading(false);
      }
      if (inFlightKeyRef.current === requestKey) {
        inFlightKeyRef.current = null;
      }
    }
  };

  // Unified fetch trigger: query and location changes
  useEffect(() => {
    if (!userLocation) return;

    const timer = setTimeout(() => {
      fetchRestaurants(searchTerm.length > 0 ? searchTerm : '');
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, userLocation]);

  // Map filter IDs to restaurant categories
  const categoryMap: Record<string, string[]> = {
    all: [],
    restaurants: ['restaurant', 'restaurants'],
    pubs: ['pub', 'pubs', 'bar'],
    cafe: ['cafe', 'café', 'coffee'],
  };

  // Filter restaurants based on active category filter
  const getFilteredRestaurants = () => {
    if (activeFilter === 'all') {
      return restaurants;
    }

    const allowedCategories = categoryMap[activeFilter] || [];
    return restaurants.filter((r) => {
      const restaurantCategory = r.category?.toLowerCase() || '';
      return allowedCategories.some(cat => restaurantCategory.includes(cat));
    });
  };

  const filteredRestaurants = getFilteredRestaurants();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 16, 60) }]}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <Text style={styles.heading}>Search</Text>
      <Text style={styles.subHeading}>Find your next table</Text>

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
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchTerm('')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
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
          <Ionicons name="warning-outline" size={42} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchRestaurants(searchTerm)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No results */}
      {!loading && !error && filteredRestaurants.length === 0 && (
        <View style={styles.centerContent}>
          <Ionicons name="search" size={48} color={Colors.gray} style={{ marginBottom: 12 }} />
          <Text style={styles.noResultsText}>
            {searchTerm ? 'No restaurants found' : 'No restaurants match this filter'}
          </Text>
          <Text style={styles.noResultsSubText}>
            {searchTerm
              ? 'Try searching with different keywords'
              : 'Try another category or clear your filter'}
          </Text>
        </View>
      )}

      {/* Count text */}
      {!loading && filteredRestaurants.length > 0 && (
        <Text style={styles.countText}>Found {filteredRestaurants.length} restaurant(s)</Text>
      )}

      {/* Cards */}
      {filteredRestaurants.map((r: any) => (
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
                rating: r.rating || 'New',
                reviews: formatReviewsCount(r.reviews_count),
                address: r.address || 'Address unavailable',
                description: r.description || 'Description unavailable',
                hours: r.hours || 'Hours unavailable',
                distance: r.distance || 'Unknown',
                latitude: r.latitude || '',
                longitude: r.longitude || '',
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
              <Text style={styles.ratingText}>{r.rating || 'New'}</Text>
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
                disabled={favoriteLoadingId === r.id}
              >
                {favoriteLoadingId === r.id ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons
                    name={favorites.includes(r.id) ? 'heart' : 'heart-outline'}
                    size={22}
                    color={favorites.includes(r.id) ? Colors.accent : Colors.text}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailsBtn}
                onPress={() =>
                  router.push({
                    pathname: '../restaurant-detail',
                    params: {
                      id: r.id,
                      name: r.name,
                      rating: r.rating || 'New',
                      reviews: formatReviewsCount(r.reviews_count),
                      address: r.address || 'Address unavailable',
                      description: r.description || 'Description unavailable',
                      hours: r.hours || 'Hours unavailable',
                      distance: r.distance || 'Unknown',
                      latitude: r.latitude || '',
                      longitude: r.longitude || '',
                    },
                  } as any)
                }
              >
                <Text style={styles.detailsBtnText}>Details</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.gray} />
              <Text style={styles.metaText}>{r.hours || 'Hours unavailable'}</Text>
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
    paddingBottom: 30,
  },

  /* Header */
  heading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
    paddingHorizontal: 20,
  },
  subHeading: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 20,
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
  clearSearchButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 10,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
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
    marginTop: 10,
  },
  retryBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFF',
  },
  retryBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.primary,
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
