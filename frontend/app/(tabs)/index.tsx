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

const API_URL = API_CONFIG.BASE_URL;

/* ── Data ── */

type Story = {
  id: string;
  name: string;
  time: string;
  badge: number;
  badgeColor: string;
  image: ImageSourcePropType;
};

type Restaurant = {
  id: string;
  name: string;
  hours: string;
  distance: string;
  rating: string;
  image: ImageSourcePropType;
};

const STORIES: Story[] = [
  {
    id: 's1',
    name: 'Romeo Lane',
    time: '8h ago',
    badge: 2,
    badgeColor: '#4CAF50',
    image: require('@/assets/food/food-1.jpeg'),
  },
  {
    id: 's2',
    name: 'Sakura Sushi…',
    time: '8h ago',
    badge: 2,
    badgeColor: Colors.accent,
    image: require('@/assets/food/food-2.jpeg'),
  },
  {
    id: 's3',
    name: 'SkyLounge …',
    time: '10h ago',
    badge: 1,
    badgeColor: Colors.primary,
    image: require('@/assets/food/food-3.jpeg'),
  },
  {
    id: 's4',
    name: 'Pret A Manger',
    time: '13h ago',
    badge: 1,
    badgeColor: Colors.primary,
    image: require('@/assets/food/food-4.jpeg'),
  },
];

const CATEGORIES = [
  { id: 'c1', emoji: '🍽️', label: 'Restaurants' },
  { id: 'c2', emoji: '🍺', label: 'Pubs' },
  { id: 'c3', emoji: '🎉', label: 'Night clubs' },
];

const RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
    name: 'Romeo Lane',
    hours: 'Open Until 11:00pm',
    distance: '0.3 miles',
    rating: '4.5',
    image: require('@/assets/restaurant-1.jpg'),
  },
  {
    id: 'r2',
    name: 'SkyLounge Bar',
    hours: 'Open Until 1:00am',
    distance: '0.8 miles',
    rating: '4.8',
    image: require('@/assets/restaurant-2.jpg'),
  },
  {
    id: 'r3',
    name: 'Sakura Sushi House',
    hours: 'Open Until 10:30pm',
    distance: '1.2 miles',
    rating: '4.7',
    image: require('@/assets/restaurant-3.jpg'),
  },
  {
    id: 'r4',
    name: 'Pret A Manger',
    hours: 'Open Until 9:00pm',
    distance: '0.1 miles',
    rating: '4.3',
    image: require('@/assets/restaurant-4.jpg'),
  },
];

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

  useEffect(() => {
    loadUserData();
    updateGreeting();
  }, []);

  // Refresh user data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
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
      }

      // Load user profile image
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImageUri(savedImage);
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
      <View style={styles.sectionHeaderCol}>
        <Text style={styles.sectionTitle}>Latest stories</Text>
        <Text style={styles.sectionSub}>Quick updates from restaurants near you</Text>
      </View>

      <FlatList
        data={STORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.storiesList}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => router.push({ pathname: '../story', params: { groupIndex: String(index) } } as any)}
          >
            <View style={styles.storyImageWrapper}>
              <Image source={item.image} style={styles.storyImage} />
              <View style={[styles.storyBadge, { backgroundColor: item.badgeColor }]}>
                <Text style={styles.storyBadgeText}>{item.badge}</Text>
              </View>
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.storyTimeRow}>
              <Ionicons name="time-outline" size={11} color={Colors.gray} />
              <Text style={styles.storyTime}>{item.time}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

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

      {RESTAURANTS.map((restaurant) => (
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
            <Image source={restaurant.image} style={styles.restaurantImage} />
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
});
