import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
  Alert,
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

const API_URL = API_CONFIG.BASE_URL;

/* ── Data ── */

type FavoriteRestaurant = {
  id: string;
  restaurant_id: string;
  name: string;
  location?: string;
  rating: string;
  distance: string;
  image: ImageSourcePropType;
  tags?: string;
};

/* ── Component ── */

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>('');
  const { isGuest } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (isGuest) {
        setShowGuestModal(true);
      } else {
        loadFavorites();
      }
    }, [isGuest])
  );

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const storedToken = await AsyncStorage.getItem('token');
      
      console.log('=== FAVORITES DEBUG ===');
      console.log('Token exists:', !!storedToken);
      if (storedToken) {
        console.log('Token length:', storedToken.length);
        console.log('Token first 30 chars:', storedToken.substring(0, 30));
        console.log('Token type:', typeof storedToken);
      }
      
      if (!storedToken) {
        console.log('❌ No token found in AsyncStorage');
        Alert.alert('Error', 'You must be logged in to view favorites. Please sign up or login first.');
        setLoading(false);
        return;
      }

      setToken(storedToken);
      console.log('Making request to:', `${API_URL}/api/favorites`);
      console.log('Authorization header:', `Bearer ${storedToken.substring(0, 30)}...`);
      
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { 
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        },
      });

      // Map backend response to restaurant type
      const restaurantList = response.data.map((item: any) => {
        // Get image based on restaurant name
        const getImage = (name: string) => {
          const imageMap: Record<string, ImageSourcePropType> = {
            'Romeo Lane': require('@/assets/restaurant-1.jpg'),
            'SkyLounge Bar': require('@/assets/restaurant-2.jpg'),
            'Sakura Sushi House': require('@/assets/restaurant-3.jpg'),
            'Pret A Manger': require('@/assets/restaurant-4.jpg'),
          };
          return imageMap[name] || require('@/assets/restaurant-1.jpg');
        };

        return {
          id: item.restaurant_id,
          restaurant_id: item.restaurant_id,
          name: item.name,
          location: item.location || '42 Fleet Street, City',
          rating: '4.5',
          distance: '0.3 miles',
          image: getImage(item.name),
          tags: 'Restaurant • Dining • Local',
        };
      });

      setFavorites(restaurantList);
    } catch (error: any) {
      console.error('Failed to load favorites:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to load favorites');
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
      Alert.alert('Removed', `${restaurantName} removed from favorites`);
    } catch (error: any) {
      console.error('Remove favorite error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to remove favorite');
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
                      address: item.location || '42 Fleet Street, City',
                      description:
                        'Fresh, handmade food and organic coffee, served quickly and with a smile.',
                      hours: 'Open Until 11:00pm',
                      distance: item.distance,
                    },
                  } as any)
                }
              >
                {/* Image */}
                <View style={styles.cardImageWrapper}>
                  <Image source={item.image} style={styles.cardImage} />
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
