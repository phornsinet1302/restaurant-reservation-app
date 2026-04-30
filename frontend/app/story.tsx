import React, { useState, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import StoryViewer, { StoryGroup } from '@/components/StoryViewer';
import { API_CONFIG } from '@/app/config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = API_CONFIG.BASE_URL;

export default function StoryScreen() {
  const { groupIndex, restaurantId } = useLocalSearchParams<{ groupIndex: string; restaurantId: string }>();
  const router = useRouter();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const lastCountRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const STORY_SCREEN_REFRESH_COOLDOWN_MS = 15000;

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current < STORY_SCREEN_REFRESH_COOLDOWN_MS) return;
      lastRefreshRef.current = now;
      console.log('👁️ Story screen focused, refreshing stories');
      loadStories();
    }, [])
  );

  const loadStories = async () => {
    try {
      // Prefer canonical token key; keep legacy fallback for older sessions.
      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('authToken'));
      
      // Fetch active stories from API
      const response = await axios.get(`${API_URL}/api/stories/active`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      const count = (response.data || []).length;
      
      // Only log if count changed (not on every refresh)
      if (count !== lastCountRef.current) {
        console.log('📖 ============ STORIES LOADED ============');
        console.log(`📖 Loaded ${count} restaurant(s) with stories`);
        
        if (count < lastCountRef.current) {
          console.log(`🗑️ STORIES DELETED: ${lastCountRef.current} → ${count}`);
        }
        
        if (!response.data || response.data.length === 0) {
          console.log('⚠️ No stories available - possible deletion');
          // Close viewer if all stories deleted
          setTimeout(() => {
            router.back();
          }, 500);
          return;
        } else {
          // Log detailed info about loaded stories
          (response.data || []).forEach((restaurant: any, idx: number) => {
            console.log(`   📱 Restaurant ${idx + 1}: "${restaurant.name}"`);
            console.log(`       └─ ${restaurant.stories?.length || 0} story(stories)`);
            if (restaurant.stories) {
              restaurant.stories.forEach((story: any, sIdx: number) => {
                const type = story.video_url ? '🎥' : '🖼️';
                console.log(`          ${type} Story ${sIdx + 1}: "${story.title || 'Untitled'}"`);
              });
            }
          });
        }
        console.log('📖 =====================================');
        lastCountRef.current = count;
      }
      
      if (!response.data || response.data.length === 0) {
        // Close the viewer if there are no more stories
        router.back();
        return;
      }

      // Transform backend data to StoryGroup format
      const groups: StoryGroup[] = (response.data || []).map((restaurant: any) => ({
        id: `s_${restaurant.id}`,
        restaurantId: restaurant.id,
        name: restaurant.name,
        time: formatTime(new Date(restaurant.stories[0]?.created_at)),
        distance: '0 miles',
        avatar: restaurant.image_url ? { uri: restaurant.image_url } : require('@/assets/food/food-1.jpeg'),
        slides: restaurant.stories.map((story: any) => ({
          image: story.image_url ? { uri: story.image_url } : require('@/assets/food/food-1.jpeg'),
          video: story.video_url ? story.video_url : undefined, // Include video if available
          title: story.title || 'Story',
          description: story.description || '',
        })),
      }));

      setStoryGroups(groups);
    } catch (error) {
      console.error('❌ Error loading stories:', error);
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

  // Resolve the correct group index: prefer restaurantId lookup over numeric index
  let initialIdx = 0;
  if (restaurantId) {
    const found = storyGroups.findIndex((g) => g.restaurantId === restaurantId);
    initialIdx = found >= 0 ? found : 0;
  } else {
    const parsed = parseInt(groupIndex ?? '0', 10);
    initialIdx = isNaN(parsed) ? 0 : Math.min(parsed, storyGroups.length - 1);
  }

  const handleStoryDeleted = () => {
    console.log('📖 Story was deleted - UI updated to reflect changes');
  };

  return (
    <StoryViewer
      groups={storyGroups.length > 0 ? storyGroups : []}
      initialGroupIndex={initialIdx}
      onClose={() => router.back()}
      onStoryDeleted={handleStoryDeleted}
    />
  );
}
