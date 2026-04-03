import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, Animated,
  LayoutAnimation, Platform, UIManager, FlatList, Modal as RNModal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { API_CONFIG } from '@/app/config/apiConfig';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Story {
  id: string;
  media_url: string;
  video_url?: string | null;
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
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [headline, setHeadline] = useState('');
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  const [previewStoryIndex, setPreviewStoryIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    console.log('🎥 [STATE CHANGE] isPlayingVideo is now:', isPlayingVideo);
  }, [isPlayingVideo]);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📖 [loadData] Loading data...');
      
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      console.log('   Token exists:', !!token);
      console.log('   User exists:', !!user);

      if (!token || !user) {
        console.warn('⚠️ No token or user found');
        setLoading(false);
        return;
      }

      // Get restaurant info
      const dashRes = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dashRes.data?.restaurant_name) {
        console.log('   Restaurant name:', dashRes.data.restaurant_name);
        setRestaurantName(dashRes.data.restaurant_name);
      }

      // Get restaurant ID and stories
      const restRes = await axios.get(`${API_CONFIG.BASE_URL}/api/restaurants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('   Found restaurants:', restRes.data?.length);
      
      const myRestaurant = restRes.data?.find?.((r: any) => r.merchant_id === user.id);
      if (myRestaurant) {
        console.log('   My restaurant ID:', myRestaurant.id);
        console.log('   My restaurant name:', myRestaurant.name);
        setRestaurantId(myRestaurant.id);
        
        // Get stories from the stories endpoint
        try {
          console.log(`   Fetching stories from: /api/stories/restaurant/${myRestaurant.id}`);
          const storiesRes = await axios.get(
            `${API_CONFIG.BASE_URL}/api/stories/restaurant/${myRestaurant.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('   📖 Stories response:', storiesRes.data);
          
          // Format stories to match expected interface
          const formattedStories = (storiesRes.data || []).map((s: any) => ({
            id: s.id,
            media_url: s.image_url,
            video_url: s.video_url || null,
            media_type: s.video_url ? 'video' : 'image',
            is_story: true,
            headline: s.title,
            caption: s.description,
            created_at: s.created_at,
            expires_at: s.expires_at,
          }));
          
          console.log(`   ✅ Formatted ${formattedStories.length} stories`);
          setStories(formattedStories);
        } catch (storiesError: any) {
          console.error('   ❌ Error loading stories:', storiesError.response?.data || storiesError.message);
          setStories([]);
        }
      } else {
        console.warn('   ⚠️ No restaurant found for this user');
      }
    } catch (error: any) {
      console.error('❌ Error loading data:', error.response?.data || error.message);
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
      setVideoUri(null);
      setMediaType('image');
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
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setVideoUri(null);
      setMediaType('image');
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const video = result.assets[0];
      // Duration from ImagePicker is in milliseconds, convert to seconds
      const durationInSeconds = video.duration ? Math.round(video.duration / 1000) : 0;
      console.log('🎥 [pickVideo] Selected video:');
      console.log('   Duration:', durationInSeconds, 'seconds (raw:', video.duration, 'ms)');
      
      // Validate video duration (max 1 minute = 60 seconds)
      if (durationInSeconds > 60) {
        Alert.alert(
          'Video too long',
          `Video must be under 1 minute (60 seconds). Your video is ${durationInSeconds} seconds.`,
          [{ text: 'OK' }]
        );
        console.log('   ❌ Video rejected: too long');
        return;
      }

      setVideoUri(video.uri);
      setImageUri(null);
      setMediaType('video');
      console.log('   ✅ Video accepted');
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
      console.log('📖 [publishStory] Starting story creation...');
      console.log('   Restaurant ID:', restaurantId);
      console.log('   Headline:', headline);
      console.log('   Media Type:', mediaType);

      // Prepare image URL
      const imageUrl = imageUri === 'cover'
        ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'
        : imageUri || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4';

      let cloudVideoUrl = null;
      
      // If video is selected, upload it to cloud storage
      if (videoUri && mediaType === 'video') {
        console.log('   🎥 Uploading video to cloud storage...');
        try {
          // Create form data for file upload
          const formData = new FormData();
          
          // Append video file
          formData.append('file', {
            uri: videoUri,
            type: 'video/mp4',
            name: `video_${Date.now()}.mp4`,
          } as any);

          console.log('   📤 Sending form data to backend...');
          console.log('   Endpoint: /api/media/upload-video');
          
          // Upload to backend endpoint that handles file upload
          const uploadRes = await axios.post(
            `${API_CONFIG.BASE_URL}/api/media/upload-video`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
              timeout: 60000, // 60 second timeout for large videos
            }
          );
          
          cloudVideoUrl = uploadRes.data.video_url;
          console.log('   ✅ Video uploaded successfully');
          console.log('   Cloud URL:', cloudVideoUrl.substring(0, 80) + '...');
        } catch (uploadError: any) {
          console.error('   ❌ Video upload failed:', uploadError.message);
          console.error('   Response:', uploadError.response?.data);
          
          // Fail with error message - don't use local paths
          Alert.alert(
            'Video Upload Failed',
            `Could not upload video to cloud storage: ${uploadError.response?.data?.error || uploadError.message}. Please try again or use a smaller video file.`
          );
          
          // Stop processing - require successful upload
          setPublishing(false);
          return;
        }
      }

      console.log('   📝 Creating story record...');
      const storyPayload = {
        restaurant_id: restaurantId,
        media_url: imageUrl,
        video_url: cloudVideoUrl,
        media_type: mediaType,
        headline: headline.trim(),
        caption: caption.trim(),
      };
      
      console.log('   Payload:', {
        restaurant_id: restaurantId,
        media_url: imageUrl.substring(0, 50) + '...',
        video_url: cloudVideoUrl ? cloudVideoUrl.substring(0, 50) + '...' : 'none',
        media_type: mediaType,
        headline,
      });

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/media/story`,
        storyPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('✅ Story created successfully:', response.data);
      Alert.alert('Published!', 'Your story is now live for customers.');
      
      // Reset form
      setImageUri(null);
      setVideoUri(null);
      setMediaType('image');
      setHeadline('');
      setCaption('');
      toggleCreateForm();
      
      // Refresh stories list
      console.log('🔄 Refreshing stories list...');
      await loadData();
      console.log('✅ Stories refreshed');
    } catch (error: any) {
      console.error('❌ Story creation error:', error.response?.data || error.message);
      Alert.alert(
        'Error', 
        `Failed to publish story: ${error.response?.data?.error || error.message}`
      );
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
            console.log(`🗑️ Deleting story: ${id}`);
            
            // Call the correct endpoint
            const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/stories/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            console.log('✅ Story deleted successfully:', response.data);
            
            // Remove from UI immediately
            setStories((prev) => {
              const updated = prev.filter((s) => s.id !== id);
              console.log(`📊 Stories updated: ${prev.length} → ${updated.length}`);
              return updated;
            });
            
            Alert.alert('Deleted', 'Story removed successfully');
          } catch (error: any) {
            console.error('❌ Error deleting story:', error.response?.data || error.message);
            Alert.alert('Error', error.response?.data?.error || 'Failed to delete story. Please try again.');
          }
        },
      },
    ]);
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      // Parse timestamp - handle both UTC and local formats
      let postedDate = new Date(dateStr);
      let now = new Date();

      // If the date string doesn't have timezone info (no Z), 
      // assume it's UTC and add 'Z' to parse correctly
      if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        postedDate = new Date(dateStr + 'Z');
      }

      // Calculate difference in milliseconds
      const diff = now.getTime() - postedDate.getTime();

      // If difference is negative or very large, there's likely a timezone issue
      if (diff < 0) {
        console.warn('⚠️ Future timestamp detected:', dateStr);
        return 'Just posted';
      }

      // Convert to different units
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      console.log('⏰ Time calc - Posted:', dateStr, 'Diff hours:', (diff / 3600000).toFixed(2));

      // Return appropriate format
      if (seconds < 60) {
        return 'Just now';
      } else if (minutes < 60) {
        return minutes === 1 ? 'Posted 1 minute ago' : `Posted ${minutes} minutes ago`;
      } else if (hours < 24) {
        return hours === 1 ? 'Posted 1 hour ago' : `Posted ${hours} hours ago`;
      } else if (days < 30) {
        return days === 1 ? 'Posted 1 day ago' : `Posted ${days} days ago`;
      } else {
        // Show date for older posts (Cambodia time format)
        const month = String(postedDate.getMonth() + 1).padStart(2, '0');
        const date = String(postedDate.getDate()).padStart(2, '0');
        return `${date}/${month}`;
      }
    } catch (error) {
      console.error('❌ Error parsing time:', error);
      return 'Recent';
    }
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
            <TouchableOpacity 
              style={styles.previewBtn}
              onPress={() => {
                if (stories.length > 0) {
                  setPreviewStoryIndex(0);
                  setShowPreview(true);
                } else {
                  Alert.alert('No stories', 'Add a story first to preview');
                }
              }}
            >
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

            {/* Rules Banner */}
            <View style={styles.rulesBanner}>
              <View style={styles.rulesItem}>
                <Ionicons name="videocam-outline" size={16} color={Colors.primary} />
                <Text style={styles.rulesText}>Videos: Max 1 minute</Text>
              </View>
              <View style={styles.rulesItem}>
                <Ionicons name="trash-outline" size={16} color={Colors.primary} />
                <Text style={styles.rulesText}>Auto-delete after 24 hours</Text>
              </View>
            </View>

            {/* Image/Video Preview */}
            <View style={styles.imagePreviewContainer}>
              {mediaType === 'video' && videoUri ? (
                <View style={styles.videoPreview}>
                  <Ionicons name="play-circle" size={64} color={Colors.primary} />
                  <Text style={styles.videoPreviewText}>Video selected</Text>
                </View>
              ) : imageUri && imageUri !== 'cover' ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : imageUri === 'cover' ? (
                <Image source={require('@/assets/images/hero-restaurant.jpg')} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={48} color={Colors.border} />
                  <Text style={styles.imagePlaceholderText}>Add a photo or video for your story</Text>
                </View>
              )}
            </View>

            {/* Upload Buttons */}
            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Ionicons name="cloud-upload-outline" size={18} color={Colors.text} />
                <Text style={styles.uploadBtnText}>Upload photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
                <Ionicons name="videocam-outline" size={18} color={Colors.text} />
                <Text style={styles.uploadBtnText}>Upload video</Text>
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
                {/* Video Thumbnail with Play Icon */}
                {story.video_url ? (
                  <View style={styles.videoThumbnailContainer}>
                    <Video
                      source={{ uri: story.video_url }}
                      style={styles.storyThumb}
                      onError={(error) => console.log('Video thumbnail error:', error)}
                    />
                    {/* Play Button Overlay */}
                    <View style={styles.playButtonOverlay}>
                      <Ionicons name="play" size={32} color="white" />
                    </View>
                  </View>
                ) : (
                  /* Image Thumbnail */
                  <Image
                    source={
                      story.media_url
                        ? { uri: story.media_url }
                        : require('@/assets/images/hero-restaurant.jpg')
                    }
                    style={styles.storyThumb}
                  />
                )}
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

      {/* Preview Modal */}
      <RNModal
        visible={showPreview}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setIsPlayingVideo(false);
          setShowPreview(false);
        }}
      >
        <View style={styles.previewContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => {
              setIsPlayingVideo(false);
              setShowPreview(false);
            }}
          >
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>

          {/* Story Preview */}
          {stories.length > 0 && (
            <View style={styles.storyPreviewWrapper}>
              {/* Image or Video */}
              {(() => {
                const story = stories[previewStoryIndex];
                const isVideo = story.media_type === 'video' && story.video_url && story.video_url.length > 0;
                console.log('🎬 [Preview] Story preview:');
                console.log('   media_type:', story.media_type);
                console.log('   video_url:', story.video_url ? story.video_url.substring(0, 80) + '...' : 'none');
                console.log('   media_url:', story.media_url ? story.media_url.substring(0, 60) + '...' : 'none');
                console.log('   isVideo (valid):', isVideo);
                console.log('   isPlayingVideo:', isPlayingVideo);
                
                if (isVideo) {
                  // For videos: show player if isPlayingVideo, else show thumbnail
                  if (isPlayingVideo) {
                    return (
                      <Video
                        ref={videoRef}
                        source={{ uri: story.video_url || '' }}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        useNativeControls
                        isLooping
                        progressUpdateIntervalMillis={1000}
                        style={{ width: '100%', height: '100%' }}
                        onError={(error) => {
                          console.error('❌ Video playback error:', error);
                          console.error('   Video URL was:', story.video_url);
                          Alert.alert('Error', 'Failed to play video. URL may be invalid or corrupt.');
                          setIsPlayingVideo(false);
                        }}
                        onLoad={() => {
                          console.log('✅ Video loaded successfully');
                        }}
                      />
                    );
                  } else {
                    // Show thumbnail with play button
                    return (
                      <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={() => {
                          console.log('   🎬 PLAY BUTTON TAPPED! Setting isPlayingVideo to true');
                          setIsPlayingVideo(true);
                        }}
                        style={styles.videoPlayerContainer}
                      >
                        <Image
                          source={{ uri: story.media_url }}
                          style={styles.storyPreviewImage}
                        />
                        <View style={styles.videoPlayOverlay}>
                          <Ionicons name="play-circle" size={80} color="white" />
                        </View>
                      </TouchableOpacity>
                    );
                  }
                } else {
                  // For regular images
                  return (
                    <Image
                      source={{ uri: story.media_url }}
                      style={styles.storyPreviewImage}
                    />
                  );
                }
              })()}

              {/* Content Overlay */}
              {!isPlayingVideo && (
                <View style={styles.previewOverlay}>
                  <Text style={styles.previewHeadline}>
                    {stories[previewStoryIndex].headline}
                  </Text>
                  <Text style={styles.previewCaption}>
                    {stories[previewStoryIndex].caption}
                  </Text>
                </View>
              )}

              {/* Navigation Arrows */}
              {stories.length > 1 && (
                <View style={styles.previewNavigation}>
                  {/* Previous */}
                  <TouchableOpacity
                    style={styles.navArrow}
                    onPress={() => {
                      setIsPlayingVideo(false);
                      setPreviewStoryIndex(
                        (previewStoryIndex - 1 + stories.length) % stories.length
                      );
                    }}
                  >
                    <Ionicons name="chevron-back" size={32} color="white" />
                  </TouchableOpacity>

                  {/* Story Counter */}
                  <View style={styles.storyCounter}>
                    <Text style={styles.storyCounterText}>
                      {previewStoryIndex + 1} / {stories.length}
                    </Text>
                  </View>

                  {/* Next */}
                  <TouchableOpacity
                    style={styles.navArrow}
                    onPress={() => {
                      setIsPlayingVideo(false);
                      setPreviewStoryIndex(
                        (previewStoryIndex + 1) % stories.length
                      );
                    }}
                  >
                    <Ionicons name="chevron-forward" size={32} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </RNModal>
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
  rulesBanner: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  rulesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rulesText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.text,
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
  videoPreview: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  videoPreviewText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.text,
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
  videoThumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F5F0E0',
  },
  storyThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F5F0E0',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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

  /* Preview Modal */
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  previewClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  storyPreviewWrapper: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    position: 'relative',
  },
  storyPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewHeadline: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: 'white',
    marginBottom: 8,
  },
  previewCaption: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  previewNavigation: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    transform: [{ translateY: -24 }],
  },
  navArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  storyCounterText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    color: 'white',
  },
  videoPlayerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    flex: 1,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});
