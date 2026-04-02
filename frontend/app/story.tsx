import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import StoryViewer, { StoryGroup } from '@/components/StoryViewer';
import { API_CONFIG } from '@/app/config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = API_CONFIG.BASE_URL;

export default function StoryScreen() {
  const { groupIndex } = useLocalSearchParams<{ groupIndex: string }>();
  const router = useRouter();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      // Fetch active stories from API
      const response = await axios.get(`${API_URL}/api/stories/active`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      // Transform backend data to StoryGroup format
      const groups: StoryGroup[] = (response.data || []).map((restaurant: any) => ({
        id: `s_${restaurant.id}`,
        name: restaurant.name,
        time: formatTime(new Date(restaurant.stories[0]?.created_at)),
        distance: '0 miles',
        avatar: restaurant.image_url ? { uri: restaurant.image_url } : require('@/assets/food/food-1.jpeg'),
        slides: restaurant.stories.map((story: any) => ({
          image: story.image_url ? { uri: story.image_url } : require('@/assets/food/food-1.jpeg'),
          title: story.title,
          description: story.description || '',
        })),
      }));

      setStoryGroups(groups);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (minutes < 1) return 'just now';
    if (hours === 0) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const idx = parseInt(groupIndex ?? '0', 10);

  return (
    <StoryViewer
      groups={storyGroups.length > 0 ? storyGroups : []}
      initialGroupIndex={Math.min(idx, storyGroups.length - 1)}
      onClose={() => router.back()}
    />
  );
}
