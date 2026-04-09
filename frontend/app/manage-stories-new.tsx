import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Modal,
  FlatList, Platform, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import CustomButton from '@/components/CustomButton';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

interface Story {
  id: string;
  image_url: string;
  title: string;
  description: string;
  created_at: string;
  expires_at: string;
  restaurant_id: string;
}

const API_URL = API_CONFIG.BASE_URL;

export default function ManageStoriesScreen() {
  const { toast, confirm } = useAppToast();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStories, setActiveStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [previewStory, setPreviewStory] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      return () => {};
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const restaurantId = await AsyncStorage.getItem('restaurantId');

      if (!token || !restaurantId) {
        toast('Please log in as a restaurant merchant first', 'error');
        router.replace('/login');
        return;
      }

      setToken(token);
      setRestaurantId(restaurantId);

      // Get restaurant details
      const resRes = await axios.get(
        `${API_URL}/api/restaurants/${restaurantId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setRestaurantName(resRes.data?.name || 'Your Restaurant');

      // Load merchant's own stories (all stories for merchant's restaurants)
      const storiesRes = await axios.get(
        `${API_URL}/api/stories/merchant/all`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Extract stories from the first restaurant if available
      // The endpoint returns array of restaurants with nested stories
      if (Array.isArray(storiesRes.data) && storiesRes.data.length > 0) {
        const allStories = storiesRes.data.flatMap(restaurant => restaurant.stories || []);
        setStories(allStories);
      } else {
        setStories([]);
      }

      // Load active stories from all restaurants for preview
      const activeRes = await axios.get(`${API_URL}/api/stories/active`, {
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      setActiveStories(activeRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast('Failed to load stories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      toast('Failed to pick image', 'error');
    }
  };

  const uploadImageAndCreateStory = async () => {
    if (!selectedImage) {
      toast('Please select an image', 'error');
      return;
    }

    if (!title.trim()) {
      toast('Please add a title', 'error');
      return;
    }

    try {
      setUploading(true);

      // Upload image
      const formData = new FormData();
      formData.append('file', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: `story-${Date.now()}.jpg`,
      } as any);

      const uploadRes = await axios.post(
        `${API_URL}/api/media/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const imageUrl = uploadRes.data?.url || uploadRes.data;

      // Create story
      const storyRes = await axios.post(
        `${API_URL}/api/stories`,
        {
          restaurantId,
          imageUrl,
          title,
          description,
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setStories([storyRes.data?.data, ...stories]);
      setShowModal(false);
      setSelectedImage(null);
      setTitle('');
      setDescription('');

      toast('Story posted! It will be visible for 24 hours.', 'success');
    } catch (error: any) {
      console.error('Error:', error);
      toast(error.response?.data?.error || 'Failed to post story', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    confirm('Delete Story', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(
                `${API_URL}/api/stories/${storyId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );
              setStories(stories.filter(s => s.id !== storyId));
              toast('Story deleted', 'success');
            } catch (error: any) {
              toast(error.response?.data?.error || 'Failed to delete', 'error');
            }
          },
        },
      ]);
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>📖 Stories</Text>
          <Text style={styles.headerSub}>Share 24-hour updates with customers</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>{restaurantName}</Text>
          <Text style={styles.infoCardText}>
            {stories.length} active stories this week
          </Text>
        </View>

        {/* Post Button */}
        <CustomButton
          title="+ Post New Story"
          onPress={() => setShowModal(true)}
          style={styles.postBtn}
        />

        {/* ── Active Stories (Preview) ── */}
        <Text style={styles.sectionTitle}>📺 Active Stories Preview</Text>
        {activeStories.length === 0 ? (
          <Text style={styles.noDataText}>No active stories from other restaurants</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewScroll}
          >
            {activeStories.map((restaurant: any) => (
              <TouchableOpacity
                key={restaurant.id}
                style={styles.previewCard}
                onPress={() => {
                  setPreviewStory(restaurant);
                  setShowPreviewModal(true);
                }}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: restaurant.stories[0]?.image_url }}
                  style={styles.previewCardImage}
                />
                <View style={styles.previewOverlay} />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <Text style={styles.previewCount}>
                    {restaurant.stories.length} {restaurant.stories.length === 1 ? 'story' : 'stories'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── Recent Stories ── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🕐 Recent Stories</Text>
        {stories.length === 0 ? (
          <Text style={styles.noDataText}>No recent stories available</Text>
        ) : (
          <FlatList
            data={stories.slice(0, 5)}
            scrollEnabled={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentCard}
                onPress={() => {
                  setPreviewStory({ name: restaurantName, stories: [item] });
                  setShowPreviewModal(true);
                }}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.recentImage}
                />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{item.title}</Text>
                  <Text style={styles.recentTime}>
                    {formatTime(item.created_at)}
                  </Text>
                  <View style={styles.storyCountBadge}>
                    <Text style={styles.storyCountText}>
                      {item.expires_at && new Date(item.expires_at) > new Date() ? '⏱️ Active' : '⏰ Expired'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* ── My Stories ── */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>✨ My Stories</Text>
        {stories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No stories yet</Text>
            <Text style={styles.emptySubtext}>Post your first story to engage customers</Text>
          </View>
        ) : (
          <FlatList
            data={stories}
            scrollEnabled={false}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.storyCard}>
                <Image source={{ uri: item.image_url }} style={styles.storyImage} />
                <View style={styles.storyInfo}>
                  <Text style={styles.storyTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.storyDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.timeRemaining}>
                    ⏱️ {getTimeRemaining(item.expires_at)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteStory(item.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </ScrollView>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} animationType="fade" transparent={true}>
        <View style={styles.previewModalContainer}>
          <TouchableOpacity
            style={styles.previewModalBackdrop}
            onPress={() => setShowPreviewModal(false)}
          />
          <View style={styles.previewModalContent}>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setShowPreviewModal(false)}
            >
              <Text style={styles.previewCloseBtnText}>✕</Text>
            </TouchableOpacity>

            {previewStory && previewStory.stories && (
              <FlatList
                data={previewStory.stories}
                keyExtractor={(_, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <View style={styles.previewSlide}>
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.previewSlideImage}
                    />
                    <View style={styles.previewSlideInfo}>
                      <Text style={styles.previewSlideTitle}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.previewSlideDesc}>{item.description}</Text>
                      )}
                      <Text style={styles.previewSlideMeta}>
                        {previewStory.name}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal visible={showModal} animationType="slide" transparent={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                setSelectedImage(null);
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Create New Story</Text>

            {/* Image Preview */}
            {selectedImage ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                <TouchableOpacity onPress={pickImage} style={styles.changeBtn}>
                  <Text style={styles.changeBtnText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={pickImage} style={styles.selectImageBtn}>
                <Text style={styles.selectImageBtnText}>📸 Select Image (9:16)</Text>
              </TouchableOpacity>
            )}

            {/* Title Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Story Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Happy Hour Special"
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            {/* Description Input */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add extra details..."
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                maxLength={300}
                textAlignVertical="top"
              />
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                ℹ️ Stories automatically expire after 24 hours and are deleted from your account and customer feeds.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setSelectedImage(null);
                  setTitle('');
                  setDescription('');
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <CustomButton
                title={uploading ? 'Posting...' : 'Post Story'}
                onPress={uploadImageAndCreateStory}
                disabled={uploading || !selectedImage}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { fontSize: 16, color: Colors.primary, marginBottom: 12, fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 4 },
  headerSub: { fontSize: 14, color: '#666' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  infoCard: {
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoCardTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  infoCardText: { fontSize: 13, color: '#666', marginTop: 4 },
  postBtn: { marginBottom: 24, backgroundColor: Colors.primary },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#666' },
  storyCard: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  storyImage: { width: 100, height: 140, backgroundColor: '#DDD' },
  storyInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  storyTitle: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 4 },
  storyDesc: { fontSize: 12, color: '#666', marginBottom: 8 },
  timeRemaining: { fontSize: 11, color: '#FF6B6B', fontWeight: '600' },
  deleteBtn: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  deleteBtnText: { fontSize: 18 },
  modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 16 },
  modalContent: { padding: 16, paddingBottom: 32 },
  closeBtn: { alignSelf: 'flex-end', padding: 8, marginBottom: 16 },
  closeBtnText: { fontSize: 16, color: '#666', fontWeight: '600' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 20 },
  selectImageBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DDD',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  selectImageBtnText: { fontSize: 16, color: '#666', fontWeight: '600' },
  previewContainer: { marginBottom: 20 },
  previewImage: { width: '100%', height: 300, borderRadius: 12, marginBottom: 12 },
  changeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  changeBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#000', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#999', marginTop: 6 },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: 12,
    borderRadius: 6,
    marginBottom: 24,
  },
  infoBoxText: { fontSize: 13, color: '#0C4A6E', lineHeight: 18 },
  buttonGroup: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, color: '#666', fontWeight: '600' },
  // Preview Modal Styles
  previewModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  previewCloseBtn: {
    alignSelf: 'flex-end',
    padding: 12,
    zIndex: 10,
  },
  previewCloseBtnText: { fontSize: 24, color: '#666', fontWeight: '600' },
  previewSlide: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  previewSlideImage: { width: '100%', height: 240, borderRadius: 12, marginBottom: 12 },
  previewSlideInfo: { paddingHorizontal: 8 },
  previewSlideTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 6 },
  previewSlideDesc: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 8 },
  previewSlideMeta: { fontSize: 12, color: '#999' },
  // Section Title
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12, marginTop: 16 },
  // Preview Cards (Active Stories)
  previewScroll: { paddingHorizontal: 0, paddingVertical: 8 },
  previewCard: {
    width: 120,
    height: 180,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#DDD',
  },
  previewCardImage: { width: '100%', height: '100%' },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  previewInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  previewName: { fontSize: 12, fontWeight: '700', color: '#fff' },
  previewCount: { fontSize: 10, color: '#CCC', marginTop: 2 },
  // Recent Cards
  recentCard: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  recentImage: { width: 80, height: 120, backgroundColor: '#DDD' },
  recentInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  recentName: { fontSize: 14, fontWeight: '600', color: '#000' },
  recentTime: { fontSize: 12, color: '#999', marginTop: 2 },
  storyCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  storyCountText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  noDataText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 16 },
});
