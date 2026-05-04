import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAuth } from '@/hooks/useAuth';
import GuestLoginModal from '@/components/GuestLoginModal';
import StoryRow from '@/components/StoryRow';
import * as Location from 'expo-location';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppToast } from '@/components/ToastProvider';

const API_URL = API_CONFIG.BASE_URL;
let LAST_HOME_REFRESH_GLOBAL_MS = 0;
let LAST_HOME_PROFILE_SYNC_GLOBAL_MS = 0;

/* ── Data ── */

type Restaurant = {
  id: string;
  name: string;
  hours: string;
  distance: string;
  rating: string;
  image: ImageSourcePropType;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  description?: string;
  category?: string;
  cuisine?: string;
  reviews_count?: number;
};

const CATEGORIES = [
  { id: 'all', emoji: '🔍', label: 'All' },
  { id: 'restaurants', emoji: '🍽️', label: 'Restaurants' },
  { id: 'pubs', emoji: '🍺', label: 'Pubs' },
  { id: 'cafe', emoji: '☕', label: 'Café' },
];

// Fallback: Default restaurant images
const DEFAULT_RESTAURANT_IMAGES: { [key: string]: ImageSourcePropType } = {
  r1: require('@/assets/restaurant-1.jpg'),
  r2: require('@/assets/restaurant-2.jpg'),
  r3: require('@/assets/restaurant-3.jpg'),
  r4: require('@/assets/restaurant-4.jpg'),
};

/* ── Helper Functions ── */

// Calculate distance between two coordinates using Haversine formula (returns km)
const calculateDistance = (
  userLat: number,
  userLon: number,
  restLat: number,
  restLon: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (restLat - userLat) * (Math.PI / 180);
  const dLon = (restLon - userLon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(userLat * (Math.PI / 180)) *
      Math.cos(restLat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format distance for display
const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${(distanceKm * 1000).toFixed(0)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
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

/** Prefer district / neighbourhood, then city — de-duplicated for reverse geocode */
function lineFromGeocode(a: Location.LocationGeocodedAddress): string {
  const parts = [a.district, a.subregion, a.city, a.region].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  );
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of parts) {
    const key = p.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p.trim());
    if (unique.length >= 2) break;
  }
  if (unique.length > 0) return unique.join(' · ');
  if (a.name) return a.name;
  return 'Your area';
}

/* ── Component ── */

export default function HomeScreen() {
  const { toast } = useAppToast();
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');
  const [favoriteLoadingId, setFavoriteLoadingId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Guest');
  const [userEmail, setUserEmail] = useState<string>('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>('Good morning');
  const { isGuest } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Location tracking
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocationAddress, setUserLocationAddress] = useState<string>('Phnom Penh');
  const { unreadCount } = useNotifications();
  const refreshingRef = useRef(false);
  const loadingRestaurantsRef = useRef(false);
  const currentLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastRefreshAtRef = useRef(LAST_HOME_REFRESH_GLOBAL_MS);
  const lastProfileSyncAtRef = useRef(LAST_HOME_PROFILE_SYNC_GLOBAL_MS);
  const lastLocationPermissionCheckRef = useRef(0);
  const lastLocationResolveRef = useRef(0);
  const HOME_REFRESH_COOLDOWN_MS = 30000;
  const PROFILE_SYNC_COOLDOWN_MS = 60000;
  const LOCATION_RESOLVE_COOLDOWN_MS = 15000;

  useEffect(() => {
    updateGreeting();
  }, []);

  // Request location permission and get current location
  const requestLocationPermission = useCallback(async (): Promise<{ latitude: number; longitude: number }> => {
    const fallback = { latitude: 11.5564, longitude: 104.9282 };
    try {
      const now = Date.now();
      if (
        currentLocationRef.current &&
        now - lastLocationResolveRef.current < LOCATION_RESOLVE_COOLDOWN_MS
      ) {
        return currentLocationRef.current;
      }

      console.log('📍 Requesting location permission...');
      const existingPerm = await Location.getForegroundPermissionsAsync();
      let status = existingPerm.status;
      if (status !== 'granted' && now - lastLocationPermissionCheckRef.current > LOCATION_RESOLVE_COOLDOWN_MS) {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
        lastLocationPermissionCheckRef.current = now;
      }
      
      if (status === 'granted') {
        console.log('✅ Location permission granted');
        const loc = await getCurrentLocation();
        lastLocationResolveRef.current = now;
        return loc;
      } else {
        console.warn('⚠️ Location permission denied');
        setLocationError('Location permission denied. Using default location.');
        setUserLocation(fallback);
        currentLocationRef.current = fallback;
        try {
          const addresses = await Location.reverseGeocodeAsync(fallback);
          if (addresses?.[0]) {
            setUserLocationAddress(lineFromGeocode(addresses[0]));
          }
        } catch {
          setUserLocationAddress('Phnom Penh');
        }
        return fallback;
      }
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      setLocationError('Could not get location');
      setUserLocation(fallback);
      currentLocationRef.current = fallback;
      setUserLocationAddress('Phnom Penh');
      return fallback;
    }
  }, []);

  // Get user's current location
  const getCurrentLocation = useCallback(async (): Promise<{ latitude: number; longitude: number }> => {
    const fallback = { latitude: 11.5564, longitude: 104.9282 };
    try {
      // Skip if OS-level location services are disabled (kCLErrorDomain error 1)
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        console.warn('⚠️ Location services disabled — using default location');
        setUserLocation(fallback);
        currentLocationRef.current = fallback;
        setUserLocationAddress('Phnom Penh');
        return fallback;
      }

      console.log('📍 Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log(`✅ Current location: ${latitude}, ${longitude}`);
      const nextLocation = { latitude, longitude };
      setUserLocation(nextLocation);
      currentLocationRef.current = nextLocation;

      // Get address from coordinates using reverse geocoding
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses && addresses.length > 0) {
          const line = lineFromGeocode(addresses[0]);
          setUserLocationAddress(line);
          console.log(`📍 Location address: ${line}`);
        }
      } catch (geoError) {
        console.warn('⚠️ Could not get location address:', geoError);
        setUserLocationAddress('Your Location');
      }

      // Store location for later use
      await AsyncStorage.setItem('userLocation', JSON.stringify(nextLocation));
      return nextLocation;
    } catch (error) {
      console.warn('⚠️ Could not get location — using default:', error);
      setLocationError('Could not get your location');
      setUserLocation(fallback);
      currentLocationRef.current = fallback;
      setUserLocationAddress('Phnom Penh');
      return fallback;
    }
  }, []);

  // Determine greeting based on current time
  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  };

  const refreshHomeData = useCallback(async () => {
    const now = Date.now();
    const lastSeen = Math.max(lastRefreshAtRef.current, LAST_HOME_REFRESH_GLOBAL_MS);
    if (now - lastSeen < HOME_REFRESH_COOLDOWN_MS) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    lastRefreshAtRef.current = now;
    LAST_HOME_REFRESH_GLOBAL_MS = now;
    try {
      await loadUserData();
      const resolvedLocation = await requestLocationPermission();
      await loadRestaurants(0, resolvedLocation);
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  // Refresh user data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      void refreshHomeData();
    }, [refreshHomeData])
  );

  const loadUserData = useCallback(async () => {
    try {
      const now = Date.now();
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        const lastProfileSync = Math.max(lastProfileSyncAtRef.current, LAST_HOME_PROFILE_SYNC_GLOBAL_MS);
        if (now - lastProfileSync > PROFILE_SYNC_COOLDOWN_MS) {
          await fetchFavorites(storedToken);
        }
      }

      // Load user profile data
      const userData = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      
      if (userData && token) {
        const parsedUser = JSON.parse(userData);
        setUserName(parsedUser.fullName || parsedUser.name || 'Guest');
        setUserEmail(parsedUser.email || '');

        // Fetch latest profile data from backend (includes profile_picture_url)
        try {
          const lastProfileSync = Math.max(lastProfileSyncAtRef.current, LAST_HOME_PROFILE_SYNC_GLOBAL_MS);
          if (now - lastProfileSync <= PROFILE_SYNC_COOLDOWN_MS) {
            if (parsedUser.profile_picture_url) {
              setProfileImageUri(parsedUser.profile_picture_url);
            }
            return;
          }
          console.log('📸 [HomeScreen] Fetching profile data from backend...');
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          });
          
          console.log('📸 [HomeScreen] Backend response received');
          console.log('   User data:', response.data?.user?.id ? '✅' : '❌');
          
          if (response.data?.user?.profile_picture_url) {
            console.log('📸 [HomeScreen] ✅ Profile picture found!');
            console.log('   URL:', response.data.user.profile_picture_url.substring(0, 60) + '...');
            setProfileImageUri(response.data.user.profile_picture_url);
            
            // Update AsyncStorage with latest profile picture URL
            parsedUser.profile_picture_url = response.data.user.profile_picture_url;
            await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
            lastProfileSyncAtRef.current = now;
            LAST_HOME_PROFILE_SYNC_GLOBAL_MS = now;
            console.log('   ✅ Saved to local storage');
          } else {
            console.log('📸 [HomeScreen] ❌ No profile picture found in backend');
            setProfileImageUri(null);
            lastProfileSyncAtRef.current = now;
            LAST_HOME_PROFILE_SYNC_GLOBAL_MS = now;
          }
        } catch (error: any) {
          console.warn('📸 [HomeScreen] ❌ Failed to fetch profile from backend:', error.message);
          console.log('   Attempt to use fallback from localStorage...');
          // Fallback to localStorage if backend fails
          if (parsedUser.profile_picture_url) {
            console.log('   ✅ Using profile picture from localStorage');
            setProfileImageUri(parsedUser.profile_picture_url);
          } else {
            console.log('   ❌ No picture in localStorage either');
            setProfileImageUri(null);
          }
        }
      } else {
        // No user data or token, clear profile image
        console.log('📸 [HomeScreen] No user data or token found');
        setProfileImageUri(null);
      }
    } catch (error) {
      console.warn('Failed to load user data:', error);
    }
  }, []);

  const fetchFavorites = useCallback(async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const favoriteIds = response.data.map((fav: any) => fav.restaurant_id);
      setFavorites(favoriteIds);
    } catch (error) {
      console.warn('Failed to fetch favorites:', error);
    }
  }, []);

  const loadRestaurants = async (
    retryCount = 0,
    forcedLocation?: { latitude: number; longitude: number } | null
  ) => {
    if (loadingRestaurantsRef.current) return;
    try {
      loadingRestaurantsRef.current = true;
      setRestaurantsLoading(true);
      console.log('📱 Loading restaurants...', retryCount > 0 ? `(Retry ${retryCount})` : '');
      // Use 30s timeout for consistency with search screen
      const response = await axios.get(`${API_URL}/api/restaurants`, { timeout: 30000 });
      
      // Get user location from state or storage
      let currentLocation = forcedLocation ?? currentLocationRef.current ?? userLocation;
      if (!currentLocation) {
        const storedLocation = await AsyncStorage.getItem('userLocation');
        if (storedLocation) {
          currentLocation = JSON.parse(storedLocation);
        } else {
          // Default to Phnom Penh if no location available
          currentLocation = { latitude: 11.5564, longitude: 104.9282 };
        }
      }
      
      // Transform API data to match Restaurant type
      const apiRestaurants = response.data?.map((r: any, index: number) => {
        let distance = 'Unknown';
        
        // Calculate distance if restaurant has coordinates
        if (r.latitude && r.longitude && currentLocation) {
          const distanceKm = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            r.latitude,
            r.longitude
          );
          distance = formatDistance(distanceKm);
        }
        
        return {
          id: r.id || `r${index + 1}`,
          name: r.name || 'Restaurant',
          hours: r.opening_hours || 'Check hours',
          distance: distance,
          rating: formatRestaurantRating(r.rating),
          latitude: r.latitude || null,
          longitude: r.longitude || null,
          // Use uploaded cover image if available, otherwise fall back to default
          image: DEFAULT_RESTAURANT_IMAGES[`r${(index % 4) + 1}`] || DEFAULT_RESTAURANT_IMAGES.r1,
          image_url: r.image_url || null,
          description: r.description || '',
          address: r.address || '',
          category: r.category || '',
          cuisine: r.cuisine || '',
          reviews_count: typeof r.reviews_count === 'number' ? r.reviews_count : 0,
        };
      }) || [];
      
      console.log('📱 [HomeScreen] Loaded restaurants with distances:', apiRestaurants.map((r: any) => ({ 
        id: r.id, 
        name: r.name,
        distance: r.distance,
      })));
      
      setRestaurants(apiRestaurants);
    } catch (error: any) {
      console.warn('Failed to load restaurants:', error.message);
      
      // Check if it's a timeout error and retry
      if (error.code === 'ECONNABORTED' && retryCount < 2) {
        console.log('⏱️ Timeout occurred, retrying... (' + (retryCount + 1) + '/2)');
        // Wait 2 seconds before retrying
        await new Promise(r => setTimeout(r, 2000));
        loadingRestaurantsRef.current = false;
        return loadRestaurants(retryCount + 1, forcedLocation);
      }
      
      setRestaurants([]);
    } finally {
      loadingRestaurantsRef.current = false;
      setRestaurantsLoading(false);
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
        toast(`${restaurantName} removed from favorites`, 'success');
      } else {
        // Add to favorites
        await axios.post(
          `${API_URL}/api/favorites/${restaurantId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFavorites((prev) => [...prev, restaurantId]);
        toast(`${restaurantName} added to favorites`, 'success');
      }
    } catch (error: any) {
      console.error('Favorite toggle error:', error.response?.data || error.message);
      toast('Failed to update favorite. Please try again.', 'error');
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            {isGuest ? (
              // Show avatar icon for guests
              <Ionicons name="person-circle" size={44} color={Colors.primary} />
            ) : profileImageUri ? (
              // Show profile picture if user has one
              <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
            ) : (
              // Show user initial or avatar fallback
              <Text style={styles.avatarLetter}>{userName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View>
            <Text style={styles.greeting}>{greeting}!</Text>
            <Text style={styles.subGreeting}>
              Welcome, {isGuest ? 'Guest' : userName}
            </Text>
            {userLocationAddress ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Colors.gray} />
                <Text style={styles.userEmail}>{userLocationAddress}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity style={styles.bellButton} onPress={() => router.push('../notifications' as any)}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <TouchableOpacity 
        style={styles.searchBox}
        onPress={() => router.push('./search' as any)}
        activeOpacity={0.7}
      >
        <Ionicons name="search" size={18} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Enter postcode or town or city"
          placeholderTextColor={Colors.gray}
          editable={false}
          pointerEvents="none"
        />
      </TouchableOpacity>

      {/* ── Latest Stories ── */}
      <StoryRow />

      {/* ── Categories ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryPill,
              selectedCategory === cat.id && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[
              styles.categoryLabel,
              selectedCategory === cat.id && styles.categoryLabelActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Top Restaurants ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Top restaurants in Phnom Penh</Text>
        <TouchableOpacity onPress={() => router.push('./search' as any)}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {restaurantsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      ) : (() => {
        // Filter restaurants by selected category - match search screen logic
        const categoryMap: Record<string, string[]> = {
          'restaurants': ['restaurant', 'restaurants'],
          'pubs': ['pub', 'pubs', 'bar'],
          'cafe': ['cafe', 'café', 'coffee'],
        };

        const filteredRestaurants = selectedCategory === 'all'
          ? restaurants
          : restaurants.filter(r => {
              const allowedCategories = categoryMap[selectedCategory] || [];
              const restaurantCategory = r.category?.toLowerCase() || '';
              return allowedCategories.some(cat => restaurantCategory.includes(cat));
            });
        
        return filteredRestaurants.length > 0 ? (
          <View>
            {filteredRestaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.restaurantCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '../restaurant-detail',
                    params: {
                      id: restaurant.id,
                      name: restaurant.name,
                      rating: restaurant.rating,
                      reviews: formatReviewsCount(restaurant.reviews_count),
                      address: restaurant.address || 'Address unavailable',
                      description: restaurant.description || 'Description unavailable',
                      hours: restaurant.hours,
                      distance: restaurant.distance,
                      latitude: restaurant.latitude || '',
                      longitude: restaurant.longitude || '',
                    },
                  } as any)
                }
              >
                {/* Image with rating badge */}
                <View style={styles.restaurantImageWrapper}>
                  {restaurant.image_url ? (
                    <Image source={{ uri: restaurant.image_url }} style={styles.restaurantImage} />
                  ) : (
                    <Image source={restaurant.image} style={styles.restaurantImage} />
                  )}
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={13} color="#FFFBF0" />
                    <Text style={styles.ratingText}>{restaurant.rating}</Text>
                  </View>
                </View>

                {/* Info row */}
                <View style={styles.restaurantInfoRow}>
                  <View style={styles.restaurantNameCol}>
                    <Text style={styles.restaurantName}>{restaurant.name}</Text>
                    {/* Hours and Distance */}
                    <View style={styles.restaurantMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={12} color={Colors.gray} />
                        <Text style={styles.metaText}>{restaurant.hours || 'Check hours'}</Text>
                      </View>
                      <View style={styles.metaDivider} />
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={Colors.gray} />
                        <Text style={styles.metaText}>{restaurant.distance || 'Distance unavailable'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.restaurantActions}>
                    <TouchableOpacity 
                      onPress={() => handleToggleFavorite(restaurant.id, restaurant.name)}
                      disabled={favoriteLoadingId === restaurant.id}
                    >
                      {favoriteLoadingId === restaurant.id ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Ionicons 
                          name={favorites.includes(restaurant.id) ? 'heart' : 'heart-outline'} 
                          size={22} 
                          color={favorites.includes(restaurant.id) ? Colors.accent : Colors.text}
                        />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.detailsButton}
                      onPress={() =>
                        router.push({
                          pathname: '../restaurant-detail',
                          params: {
                            id: restaurant.id,
                            name: restaurant.name,
                            rating: restaurant.rating,
                            reviews: formatReviewsCount(restaurant.reviews_count),
                            address: restaurant.address || 'Address unavailable',
                            description: restaurant.description || 'Description unavailable',
                            hours: restaurant.hours,
                            distance: restaurant.distance,
                            latitude: restaurant.latitude || '',
                            longitude: restaurant.longitude || '',
                          },
                        } as any)
                      }
                    >
                      <Text style={styles.detailsText}>Details</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.gray} />
            <Text style={styles.emptyText}>
              {selectedCategory === 'all' ? 'No restaurants available' : 'No restaurants in this category'}
            </Text>
            <Text style={styles.emptySubtext}>
              {selectedCategory === 'all' 
                ? 'Check back later for new restaurants' 
                : 'Try selecting a different category'}
            </Text>
          </View>
        );
      })()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0E5C0',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarLetter: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.primary,
  },
  greeting: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  subGreeting: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 1,
  },
  userEmail: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF2424',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: '#fff',
  },

  /* Search */
  searchBox: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F5EFDC',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.text,
    fontSize: 14,
  },

  /* Section headers */
  sectionHeaderCol: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  sectionSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  seeAll: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },

  /* Stories */
  storiesList: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 22,
  },
  storyItem: {
    alignItems: 'center',
    width: 80,
  },
  storyImageWrapper: {
    width: 76,
    height: 76,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 6,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  storyBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: Colors.white,
  },
  storyName: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    width: 80,
  },
  storyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  storyTime: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: Colors.gray,
  },

  /* Categories */
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 0,
    gap: 10,
    marginBottom: 24,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  categoryPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },

  /* Restaurant card */
  restaurantCard: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  restaurantImageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
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
  restaurantInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 10,
  },
  restaurantNameCol: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.border,
  },
  metaText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
  },
  restaurantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  detailsText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
    color: Colors.text,
  },
  emptySubtext: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },
});
