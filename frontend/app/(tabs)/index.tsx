import React, { useState, useEffect } from 'react';
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
import StoryRow from '@/components/StoryRow';

const API_URL = API_CONFIG.BASE_URL;

/* ── Data ── */

type Restaurant = {
  id: string;
  name: string;
  hours: string;
  distance: string;
  rating: string;
  image: ImageSourcePropType;
  image_url?: string;
};

const CATEGORIES = [
  { id: 'c1', emoji: '🍽️', label: 'Restaurants' },
  { id: 'c2', emoji: '🍺', label: 'Pubs' },
  { id: 'c3', emoji: '🎉', label: 'Night clubs' },
];

// Fallback: Default restaurant images
const DEFAULT_RESTAURANT_IMAGES: { [key: string]: ImageSourcePropType } = {
  r1: require('@/assets/restaurant-1.jpg'),
  r2: require('@/assets/restaurant-2.jpg'),
  r3: require('@/assets/restaurant-3.jpg'),
  r4: require('@/assets/restaurant-4.jpg'),
};

/* ── Component ── */

export default function HomeScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string>('Guest');
  const [userEmail, setUserEmail] = useState<string>('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<string>('Good morning');
  const { isGuest } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadRestaurants();
    updateGreeting();
  }, []);

  // Refresh user data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      loadRestaurants();
    }, [])
  );

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

  const loadUserData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        await fetchFavorites(storedToken);
      }

      // Load user profile data
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserName(parsedUser.fullName || parsedUser.name || 'Guest');
        setUserEmail(parsedUser.email || '');

        // Load user profile image - use user ID for unique key
        if (parsedUser.id || parsedUser.email) {
          const userIdKey = parsedUser.id || parsedUser.email;
          const savedImage = await AsyncStorage.getItem(`profileImage_${userIdKey}`);
          if (savedImage) {
            setProfileImageUri(savedImage);
          } else {
            setProfileImageUri(null); // Clear old image if user has none
          }
        }
      } else {
        // No user data, clear profile image
        setProfileImageUri(null);
      }
    } catch (error) {
      console.warn('Failed to load user data:', error);
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

  const loadRestaurants = async () => {
    try {
      setRestaurantsLoading(true);
      const response = await axios.get(`${API_URL}/api/restaurants`);
      
      // Transform API data to match Restaurant type
      const apiRestaurants = response.data?.map((r: any, index: number) => ({
        id: r.id || `r${index + 1}`,
        name: r.name || 'Restaurant',
        hours: r.opening_hours || 'Check hours',
        distance: '0.5 miles', // TODO: Calculate from user location
        rating: r.rating || '4.5',
        // Use uploaded cover image if available, otherwise fall back to default
        image: DEFAULT_RESTAURANT_IMAGES[`r${(index % 4) + 1}`] || DEFAULT_RESTAURANT_IMAGES.r1,
        image_url: r.image_url || null,
        description: r.description || '',
        address: r.address || '',
        category: r.category || '',
        cuisine: r.cuisine || '',
      })) || [];
      
      console.log('📱 [HomeScreen] Loaded restaurants:', apiRestaurants.map((r: any) => ({ 
        id: r.id, 
        name: r.name, 
        hasCustomImage: !!r.image_url 
      })));
      
      setRestaurants(apiRestaurants);
    } catch (error) {
      console.warn('Failed to load restaurants:', error);
      setRestaurants([]); // Use empty array if API fails
    } finally {
      setRestaurantsLoading(false);
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

    setLoading(true);
    try {
      const isFavorited = favorites.includes(restaurantId);
      
      if (isFavorited) {
        // Remove from favorites
        await axios.delete(`${API_URL}/api/favorites/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavorites((prev) => prev.filter((id) => id !== restaurantId));
        Alert.alert('Removed', `${restaurantName} removed from favorites`);
      } else {
        // Add to favorites
        await axios.post(
          `${API_URL}/api/favorites/${restaurantId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFavorites((prev) => [...prev, restaurantId]);
        Alert.alert('Added', `${restaurantName} added to favorites`);
      }
    } catch (error: any) {
      console.error('Favorite toggle error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    } finally {
      setLoading(false);
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
            {!isGuest && userEmail && (
              <Text style={styles.userEmail}>{userEmail}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.bellButton} onPress={() => router.push('../notifications' as any)}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
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
      <View style={styles.categoriesRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.id} style={styles.categoryPill}>
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Top Restaurants ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Top restaurants in London</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {restaurantsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      ) : restaurants.length > 0 ? (
        restaurants.map((restaurant) => (
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
                reviews: '3.2k',
                address: '42 Fleet Street, City',
                description: 'Fresh, handmade food and organic coffee, served quickly and with a smile.',
                hours: restaurant.hours,
                distance: restaurant.distance,
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
            </View>
            <View style={styles.restaurantActions}>
              <TouchableOpacity 
                onPress={() => handleToggleFavorite(restaurant.id, restaurant.name)}
                disabled={loading}
              >
                <Ionicons 
                  name={favorites.includes(restaurant.id) ? 'heart' : 'heart-outline'} 
                  size={22} 
                  color={favorites.includes(restaurant.id) ? Colors.accent : Colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsText}>Details</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.restaurantMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.gray} />
              <Text style={styles.metaText}>{restaurant.hours}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.gray} />
              <Text style={styles.metaText}>{restaurant.distance}</Text>
            </View>
          </View>
        </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={48} color={Colors.gray} />
          <Text style={styles.emptyText}>No restaurants available</Text>
          <Text style={styles.emptySubtext}>Check back later for new restaurants</Text>
        </View>
      )}
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
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
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
    alignItems: 'center',
    marginTop: 12,
  },
  restaurantNameCol: {
    flex: 1,
  },
  restaurantName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  restaurantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  detailsText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  restaurantMeta: {
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
