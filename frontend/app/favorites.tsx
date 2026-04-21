import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
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
import { useAppToast } from '@/components/ToastProvider';

const API_URL = API_CONFIG.BASE_URL;

/* ── Data ── */

type FavoriteRestaurant = {
  id: string;
  restaurant_id: string;
  name: string;
  location?: string;
  rating: string;
  distance: string;
  image?: ImageSourcePropType;
  image_url?: string;
  tags?: string;
  address?: string;
  description?: string;
  hours?: string;
  latitude?: string;
  longitude?: string;
  category?: string;
};

/* ── Component ── */

export default function FavoritesScreen() {
  const { toast } = useAppToast();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const { isGuest } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (isGuest) {
        setShowGuestModal(true);
      } else {
        loadUserLocation();
        loadFavorites();
      }
    }, [isGuest])
  );

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

  // Load user location
  const loadUserLocation = async () => {
    try {
      const storedLocation = await AsyncStorage.getItem('userLocation');
      if (storedLocation) {
        const location = JSON.parse(storedLocation);
        setUserLocation(location);
      } else {
        // Default location
        setUserLocation({ latitude: 11.5564, longitude: 104.9282 });
      }
    } catch (error) {
      console.warn('Failed to load user location:', error);
      setUserLocation({ latitude: 11.5564, longitude: 104.9282 });
    }
  };

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const storedToken = await AsyncStorage.getItem('token');
      
      if (!storedToken) {
        toast('You must be logged in to view favorites. Please sign up or login first.', 'error');
        setLoading(false);
        return;
      }

      setToken(storedToken);
      
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { 
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('✅ Raw favorites response:', response.data);

      // Get current user location (wait a bit for it to be loaded)
      let location = userLocation;
      if (!location) {
        await new Promise(r => setTimeout(r, 500));
        location = userLocation;
      }
      if (!location) {
        location = { latitude: 11.5564, longitude: 104.9282 };
      }

      // Map backend response to restaurant type with REAL data like home screen
      const restaurantList = response.data.map((item: any) => {
        const restaurant = item.restaurants;
        let distance = 'Unknown';

        // Calculate distance if restaurant has coordinates
        if (restaurant?.latitude && restaurant?.longitude && location) {
          try {
            const distanceKm = calculateDistance(
              location.latitude,
              location.longitude,
              restaurant.latitude,
              restaurant.longitude
            );
            distance = formatDistance(distanceKm);
          } catch (err) {
            console.warn('Error calculating distance:', err);
          }
        }

        console.log('📍 Restaurant:', {
          name: restaurant?.name,
          image_url: restaurant?.image_url,
          distance: distance,
        });

        return {
          id: item.restaurant_id,
          restaurant_id: item.restaurant_id,
          name: restaurant?.name || 'Restaurant',
          location: restaurant?.address || 'No address',
          rating: restaurant?.rating || '4.5',
          distance: distance,
          image_url: restaurant?.image_url || '',
          tags: restaurant?.category || 'Restaurant',
          // Store real data for detail page
          address: restaurant?.address || 'No address',
          description: restaurant?.description || 'No description available',
          hours: restaurant?.opening_hours || 'Check hours',
          latitude: restaurant?.latitude?.toString() || '',
          longitude: restaurant?.longitude?.toString() || '',
          category: restaurant?.category || '',
          phone: restaurant?.phone || '',
          cuisine: restaurant?.cuisine || '',
        };
      });

      console.log('📱 Mapped favorites with distances:', restaurantList);
      setFavorites(restaurantList);
    } catch (error: any) {
      console.error('Failed to load favorites:', error.response?.data || error.message);
      toast('Failed to load favorites', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (restaurantId: string, restaurantName: string) => {
    try {
      await axios.delete(`${API_URL}/api/favorites/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFavorites((prev) => prev.filter((f) => f.restaurant_id !== restaurantId));
      toast(`${restaurantName} removed from favorites`, 'success');
    } catch (error: any) {
      console.error('Remove favorite error:', error.response?.data || error.message);
      toast('Failed to remove favorite', 'error');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Favorite Restaurants</Text>
          <Text style={styles.headerSub}>{favorites.length} saved</Text>
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      )}

      {/* List */}
      {!loading && (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {favorites.length > 0 ? (
            favorites.map((item) => (
              <TouchableOpacity
                key={item.restaurant_id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '/restaurant-detail',
                    params: {
                      id: item.restaurant_id,
                      name: item.name,
                      rating: item.rating,
                      reviews: '3.2k',
                      address: item.address || item.location || 'No address',
                      description: item.description || 'No description available',
                      hours: item.hours || 'Check hours',
                      distance: item.distance,
                      latitude: item.latitude || '',
                      longitude: item.longitude || '',
                    },
                  } as any)
                }
              >
                {/* Image */}
                <View style={styles.cardImageWrapper}>
                  {item.image_url && !imageErrors[item.restaurant_id] ? (
                    <Image 
                      source={{ uri: item.image_url }} 
                      style={styles.cardImage}
                      onError={() => {
                        console.warn(`❌ Failed to load image for ${item.name}:`, item.image_url);
                        setImageErrors(prev => ({ ...prev, [item.restaurant_id]: true }));
                      }}
                    />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="restaurant" size={48} color={Colors.gray} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => removeFavorite(item.restaurant_id, item.name)}
                  >
                    <Ionicons name="heart" size={20} color={Colors.accent} />
                  </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardTags}>{item.tags}</Text>
                  <View style={styles.cardMeta}>
                    <Ionicons name="star" size={14} color={Colors.primary} />
                    <Text style={styles.cardRating}>{item.rating}</Text>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={Colors.gray}
                      style={{ marginLeft: 12 }}
                    />
                    <Text style={styles.cardDistance}>{item.distance}</Text>
                  </View>
                  <Text style={styles.cardHours}>{item.hours}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No favorites yet</Text>
              <Text style={styles.emptySubText}>Start adding restaurants to your favorites</Text>
            </View>
          )}
        </ScrollView>
      )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },

  /* Card */
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  cardImageWrapper: {
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: 14,
  },
  cardName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    color: Colors.text,
    marginBottom: 4,
  },
  cardTags: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardRating: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  cardDistance: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },
  cardHours: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 6,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
    color: Colors.gray,
  },
  emptySubText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
});
