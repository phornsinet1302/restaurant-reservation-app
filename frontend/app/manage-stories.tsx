import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, Animated,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { API_CONFIG } from '@/app/config/apiConfig';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  is_story: boolean;
  headline?: string;
  caption?: string;
  created_at: string;
  expires_at?: string;
}

export default function ManageStoriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [stories, setStories] = useState<Story[]>([]);

  // Create story form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [headline, setHeadline] = useState('');
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!token || !user) return;

      // Get restaurant info
      const dashRes = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dashRes.data?.restaurant_name) setRestaurantName(dashRes.data.restaurant_name);

      // Get restaurant ID
      const restRes = await axios.get(`${API_CONFIG.BASE_URL}/api/restaurants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const myRestaurant = restRes.data?.find?.((r: any) => r.merchant_id === user.id);
      if (myRestaurant) {
        setRestaurantId(myRestaurant.id);
        // Load stories
        const mediaRes = await axios.get(`${API_CONFIG.BASE_URL}/api/media`, {
          params: { restaurant_id: myRestaurant.id },
          headers: { Authorization: `Bearer ${token}` },
        });
        const storyItems = (mediaRes.data || []).filter((m: any) => m.is_story);
        setStories(storyItems);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const activeStoryCount = stories.filter((s) => {
    if (!s.expires_at) return true;
    return new Date(s.expires_at) > new Date();
  }).length;

  const toggleCreateForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (showCreateForm) {
      // Reset form when closing
      setImageUri(null);
      setHeadline('');
      setCaption('');
    }
    setShowCreateForm(!showCreateForm);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const useCoverImage = () => {
    // Use the hero restaurant image as a fallback cover
    setImageUri('cover');
  };

  const publishStory = async () => {
    if (!headline.trim()) {
      Alert.alert('Missing headline', 'Please add a headline for your story.');
      return;
    }
    if (!restaurantId) {
      Alert.alert('Error', 'No restaurant found.');
      return;
    }

    setPublishing(true);
    try {
      const token = await AsyncStorage.getItem('token');

      // For now, use a placeholder URL if no image uploaded
      const mediaUrl = imageUri === 'cover'
        ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'
        : imageUri || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4';

      await axios.post(
        `${API_CONFIG.BASE_URL}/api/media/story`,
        {
          restaurant_id: restaurantId,
          media_url: mediaUrl,
          media_type: 'image',
          headline: headline.trim(),
          caption: caption.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Published!', 'Your story is now live for customers.');
      toggleCreateForm();
      loadData(); // Refresh
    } catch {
      Alert.alert('Error', 'Failed to publish story. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const deleteStory = (id: string) => {
    Alert.alert('Delete story', 'Are you sure you want to remove this story?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.delete(`${API_CONFIG.BASE_URL}/api/media/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setStories((prev) => prev.filter((s) => s.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete story.');
          }
        },
      },
    ]);
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `Posted ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Posted ${days}d ago`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Stories</Text>
            <Text style={styles.headerSub}>Share quick updates customers can view on your listing</Text>
          </View>
          <TouchableOpacity style={styles.addStoryBtn} onPress={toggleCreateForm}>
            <Text style={styles.addStoryBtnText}>Add story</Text>
          </TouchableOpacity>
        </View>

        {/* Live Info Card */}
        <View style={styles.liveCard}>
          <View style={styles.liveCardHeader}>
            <View style={styles.liveIconCircle}>
              <Ionicons name="storefront-outline" size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.liveLabel}>LIVE ON CUSTOMER SIDE</Text>
              <Text style={styles.liveName}>{restaurantName || 'Your Restaurant'}</Text>
              <Text style={styles.liveDesc}>
                Stories added here appear in the customer home stories row and on your public restaurant detail page.
              </Text>
            </View>
          </View>

          <View style={styles.liveStats}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{activeStoryCount}</Text>
              <Text style={styles.statLabel}>Active stories</Text>
            </View>
            <TouchableOpacity style={styles.previewBtn}>
              <Ionicons name="eye-outline" size={18} color={Colors.text} />
              <Text style={styles.previewBtnText}>Preview</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Story Form (dropdown) */}
        {showCreateForm && (
          <View style={styles.createCard}>
            <View style={styles.createCardHeader}>
              <View>
                <Text style={styles.createTitle}>Create story</Text>
                <Text style={styles.createSub}>
                  Add one short visual update for customers browsing your restaurant.
                </Text>
              </View>
              <TouchableOpacity onPress={toggleCreateForm}>
                <Ionicons name="trash-outline" size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            {/* Image Preview */}
            <View style={styles.imagePreviewContainer}>
              {imageUri && imageUri !== 'cover' ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : imageUri === 'cover' ? (
                <Image source={require('@/assets/images/hero-restaurant.jpg')} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={48} color={Colors.border} />
                  <Text style={styles.imagePlaceholderText}>Add a photo for your story</Text>
                </View>
              )}
            </View>

            {/* Upload Buttons */}
            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Ionicons name="cloud-upload-outline" size={18} color={Colors.text} />
                <Text style={styles.uploadBtnText}>Upload photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={useCoverImage}>
                <Ionicons name="images-outline" size={18} color={Colors.text} />
                <Text style={styles.uploadBtnText}>Use cover</Text>
              </TouchableOpacity>
            </View>

            {/* Headline */}
            <Text style={styles.fieldLabel}>Headline</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Tonight's dinner service is open"
              placeholderTextColor={Colors.gray}
              value={headline}
              onChangeText={setHeadline}
              maxLength={80}
            />

            {/* Caption */}
            <Text style={styles.fieldLabel}>Caption</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Tell customers what is new today."
              placeholderTextColor={Colors.gray}
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
              maxLength={300}
              textAlignVertical="top"
            />

            {/* Publish Button */}
            <TouchableOpacity
              style={[styles.publishBtn, publishing && { opacity: 0.6 }]}
              onPress={publishStory}
              disabled={publishing}
            >
              {publishing ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <Text style={styles.publishBtnText}>Publish story</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Stories */}
        <View style={styles.recentCard}>
          <Text style={styles.recentTitle}>Recent stories</Text>
          <Text style={styles.recentSub}>Your newest story appears first for customers</Text>

          {stories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={40} color={Colors.border} />
              <Text style={styles.emptyText}>No stories yet</Text>
              <Text style={styles.emptySubText}>
                Tap "Add story" to share your first update with customers.
              </Text>
            </View>
          ) : (
            stories.map((story) => (
              <View key={story.id} style={styles.storyItem}>
                <Image
                  source={
                    story.media_url
                      ? { uri: story.media_url }
                      : require('@/assets/images/hero-restaurant.jpg')
                  }
                  style={styles.storyThumb}
                />
                <View style={styles.storyInfo}>
                  <Text style={styles.storyTitle} numberOfLines={1}>
                    {story.headline || 'Untitled story'}
                  </Text>
                  <Text style={styles.storyCaption} numberOfLines={2}>
                    {story.caption || 'No caption'}
                  </Text>
                  <Text style={styles.storyTime}>{getTimeAgo(story.created_at)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteStory(story.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: { marginTop: 4 },
  headerTextBlock: { flex: 1 },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
    lineHeight: 18,
  },
  addStoryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 2,
  },
  addStoryBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.text,
  },

  /* Live Info Card */
  liveCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  liveCardHeader: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  liveIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 11,
    color: Colors.gray,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  liveName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 6,
  },
  liveDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    lineHeight: 19,
  },
  liveStats: {
    flexDirection: 'row',
    gap: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },

  /* Create Story Form */
  createCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  createCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  createTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  createSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
    lineHeight: 19,
    maxWidth: 280,
  },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F0E0',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  uploadBtnText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.text,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  publishBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  publishBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },

  /* Recent Stories */
  recentCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recentTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  recentSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
    marginBottom: 16,
  },
  storyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  storyThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F0E0',
  },
  storyInfo: { flex: 1 },
  storyTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  storyCaption: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
    lineHeight: 17,
  },
  storyTime: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: Colors.gray,
    marginTop: 4,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  emptySubText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
    maxWidth: 240,
  },
});
