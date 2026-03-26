import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function SearchScreen() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [token, setToken] = useState<string>('');
  const [toggleLoading, setToggleLoading] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const { isGuest } = useAuth();
  const router = useRouter();

  // Load favorites on mount
  useEffect(() => {
    loadFavoritesAndToken();
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
  const fetchRestaurants = async (query: string) => {
    try {
      setLoading(true);
      setError('');
      
      const url = query 
        ? `${API_URL}/api/restaurants?search=${encodeURIComponent(query)}`
        : `${API_URL}/api/restaurants`;
      
      const response = await axios.get(url);
      setRestaurants(response.data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch restaurants');
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
                address: r.address || 'No address provided',
                description: r.description || 'No description',
              },
            } as any)
          }
        >
          {/* Placeholder Image */}
          <View style={styles.cardImageWrapper}>
            <View style={styles.placeholderImage}>
              <Ionicons name="restaurant" size={48} color={Colors.gray} />
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#FFFBF0" />
              <Text style={styles.ratingText}>4.5</Text>
            </View>
          </View>

          {/* Name row */}
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{r.name}</Text>
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
                <Text style={styles.detailsBtnText}>View</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Address */}
          <Text style={styles.cardAddress} numberOfLines={1}>{r.address}</Text>

          {/* Description */}
          {r.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>{r.description}</Text>
          )}
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
  cardNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cardName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    flex: 1,
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
  cardAddress: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  cardDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
    marginTop: 8,
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
