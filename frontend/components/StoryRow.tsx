import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const API_URL = API_CONFIG.BASE_URL;

interface Story {
  id: string;
  image_url: string;
  video_url?: string;
  title: string;
  description: string;
  created_at: string;
}

interface Restaurant {
  id: string;
  name: string;
  phone?: string;
  image_url?: string;
  stories: Story[];
}

export default function StoryRow() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentStories();
  }, []);

  // Refresh stories whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadRecentStories();
    }, [])
  );

  const loadRecentStories = async () => {
    try {
      setLoading(true);
      console.log('📖 Fetching stories from:', `${API_URL}/api/stories/active`);
      const response = await axios.get(`${API_URL}/api/stories/active`);
      
      console.log('📖 ============ API RESPONSE ============');
      console.log('📖 Status:', response.status);
      console.log('📖 Data:', response.data);
      console.log('📖 Data length:', response.data?.length || 0);
      
      if (response.data && response.data.length > 0) {
        response.data.forEach((restaurant: any, idx: number) => {
          console.log(`📖 Restaurant ${idx}:`, {
            id: restaurant.id,
            name: restaurant.name,
            storiesCount: restaurant.stories?.length || 0,
            stories: restaurant.stories,
          });
        });
      } else {
        console.log('📖 No restaurants with stories returned');
      }
      
      console.log('📖 ======================================');
      setRestaurants(response.data || []);
    } catch (error: any) {
      console.error('❌ Error loading stories:', error.response?.data || error.message);
      console.error('❌ Status:', error.response?.status);
      setRestaurants([]); // Fail gracefully
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (minutes < 1) return 'just now';
    if (hours === 0) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No stories available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📖 Recent Stories</Text>
        <TouchableOpacity onPress={() => router.push('/story?groupIndex=0')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {restaurants.map((restaurant, idx) => {
          const firstStory = restaurant.stories[0];
          if (!firstStory) return null;

          return (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.storyCard}
              onPress={() => router.push(`/story?groupIndex=${idx}`)}
              activeOpacity={0.8}
            >
              {/* Story Thumbnail with Gradient Overlay */}
              <Image
                source={{ uri: firstStory.image_url }}
                style={styles.thumbnail}
              />
              <View style={styles.overlay} />

              {/* Video Badge - if story has video */}
              {firstStory.video_url && (
                <View style={styles.videoBadge}>
                  <Ionicons name="play-circle" size={24} color="#fff" />
                </View>
              )}

              {/* Restaurant Info */}
              <View style={styles.info}>
                {/* Avatar - use first letter if no image */}
                {restaurant.image_url ? (
                  <Image
                    source={{ uri: restaurant.image_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarText}>
                      {restaurant.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Text */}
                <View style={styles.textContainer}>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <Text style={styles.time}>
                    {formatTime(firstStory.created_at)}
                  </Text>
                </View>

                {/* Story Count Badge */}
                {restaurant.stories.length > 1 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>+{restaurant.stories.length - 1}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCard: {
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 6,
  },
  avatarFallback: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  textContainer: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  time: {
    fontSize: 10,
    color: '#e0e0e0',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
});
