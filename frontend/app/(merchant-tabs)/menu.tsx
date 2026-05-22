import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, RefreshControl, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import * as ImagePicker from 'expo-image-picker';
import { convertToJpeg } from '@/utils/imageUtils';
import { useAppToast } from '@/components/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  restaurant_id: string;
}

export default function MerchantMenuScreen() {
  const { toast, confirm } = useAppToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editAvailability, setEditAvailability] = useState<'available' | 'sold_out'>('available');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ No token found');
        return;
      }

      console.log('📋 [loadData] Loading merchant menu...');

      // Get merchant's restaurant directly
      const restRes = await axios.get(
        `${API_CONFIG.BASE_URL}/api/restaurants/merchant/my-restaurant`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!restRes.data?.data?.id) {
        console.error('❌ No restaurant found for merchant');
        setMenuItems([]);
        setLoading(false);
        return;
      }

      const restaurant = restRes.data.data;
      console.log('✅ Restaurant found:', restaurant.id, restaurant.name);
      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);

      // Get menu items for this restaurant
      console.log('🍽️  Fetching menu items for restaurant:', restaurant.id);
      const menuRes = await axios.get(
        `${API_CONFIG.BASE_URL}/api/menu?restaurant_id=${restaurant.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📊 [loadData] Full response:', menuRes);
      console.log('📊 [loadData] Response data:', menuRes.data);
      console.log('📊 [loadData] Response data type:', typeof menuRes.data);
      console.log('📊 [loadData] Is array?', Array.isArray(menuRes.data));
      console.log('📊 [loadData] Response keys:', Object.keys(menuRes.data || {}));

      // Handle multiple possible response formats
      let items = [];
      if (Array.isArray(menuRes.data)) {
        items = menuRes.data;
      } else if (menuRes.data?.data && Array.isArray(menuRes.data.data)) {
        items = menuRes.data.data;
      } else if (menuRes.data?.items && Array.isArray(menuRes.data.items)) {
        items = menuRes.data.items;
      } else {
        console.warn('⚠️  Unable to extract items from response. Response:', menuRes.data);
        items = [];
      }
      
      console.log(`✅ Found ${items.length} menu items:`, items);
      setMenuItems(items);
    } catch (error: any) {
      // If there's no response property it's likely a network error
      if (!error || !error.response) {
        toast('No internet connection. Please check your network.', 'error');
      } else {
        console.error('❌ Error loading menu:', error.message);
        console.error('   Status:', error.response?.status);
        console.error('   Data:', error.response?.data);
      }
      setMenuItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    console.log('👀 [useFocusEffect] Menu screen focused - loading data...');
    loadData();
  }, [loadData]));

  const onRefresh = () => {
    console.log('🔄 [onRefresh] Refreshing menu...');
    setRefreshing(true);
    loadData();
  };

  const openEditModal = (item: MenuItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditCategory(item.category || '');
    setEditPrice(item.price?.toString() || '0');
    setEditAvailability(
      item.is_available === false ? 'sold_out' : 'available'
    );
    setEditImageUri(null);
  };

  const closeEditModal = () => {
    setEditItem(null);
    setEditImageUri(null);
  };

  const pickEditImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast('Please allow access to your photo library.', 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (!editName.trim()) {
      toast('Dish name is required', 'error');
      return;
    }
    if (!editCategory.trim()) {
      toast('Category is required', 'error');
      return;
    }
    const parsedPrice = parseFloat(editPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast('Please enter a valid price', 'error');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');

      let imageUrl = editItem.image_url;

      // Upload new image if one was picked
      if (editImageUri) {
        const jpegUri = await convertToJpeg(editImageUri);
        const formData = new FormData();
        formData.append('file', {
          uri: jpegUri,
          type: 'image/jpeg',
          name: `menu-${Date.now()}.jpg`,
        } as any);
        try {
          const uploadRes = await fetch(
            `${API_CONFIG.BASE_URL}/api/media/upload-image`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            }
          );
          const uploadData = await uploadRes.json();
          imageUrl = uploadData?.image_url;
        } catch {
          toast('Image upload failed, keeping current photo', 'warning');
        }
      }

      const updates: any = {
        name: editName.trim(),
        description: editDescription.trim(),
        category: editCategory.trim(),
        price: parsedPrice,
        image_url: imageUrl,
        is_available: editAvailability !== 'sold_out',
      };

      await axios.put(`${API_CONFIG.BASE_URL}/api/menu/${editItem.id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state immediately
      setMenuItems(prev =>
        prev.map(m => m.id === editItem.id ? { ...m, ...updates } : m)
      );

      closeEditModal();
      toast('Menu item updated successfully', 'success');
    } catch (error: any) {
      if (!error || !error.response) {
        toast('No internet connection. Please check your network.', 'error');
      } else {
        toast(error.response?.data?.error || 'Failed to update menu item', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: MenuItem) => {
    confirm('Delete Item', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.delete(`${API_CONFIG.BASE_URL}/api/menu/${item.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setMenuItems(prev => prev.filter(m => m.id !== item.id));
          } catch (error: any) {
            if (!error || !error.response) {
              toast('No internet connection. Please check your network.', 'error');
            } else {
              toast('Failed to delete item', 'error');
            }
          }
        },
      },
    ]);
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCount = menuItems.filter(i => i.is_available !== false).length;
  const soldOutCount = menuItems.filter(i => i.is_available === false).length;

  const getStatusBadge = (item: MenuItem) => {
    if (item.is_available === false) return { label: 'Sold Out', color: '#E74C3C', bg: '#FDEDEC' };
    return { label: 'Available', color: '#2BA15C', bg: '#E8F8EF' };
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
          <View>
            <Text style={styles.title}>Menu</Text>
            <Text style={styles.subtitle}>Manage what customers see on your public{'\n'}restaurant page</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-menu-item' as any)}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Sync Card */}
        <View style={styles.syncCard}>
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>PUBLIC MENU SYNC</Text>
          </View>
          <Text style={styles.syncRestaurantName}>{restaurantName}</Text>
          <Text style={styles.syncDesc}>Menu changes here update the customer{'\n'}restaurant detail page.</Text>
          <View style={styles.syncStats}>
            <View style={styles.syncStatItem}>
              <Text style={styles.syncStatValue}>{availableCount}</Text>
              <Text style={styles.syncStatLabel}>Available</Text>
            </View>
            <View style={styles.syncStatItem}>
              <Text style={styles.syncStatValue}>{soldOutCount}</Text>
              <Text style={styles.syncStatLabel}>Sold out</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            placeholderTextColor={Colors.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Menu Items */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No menu items yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Item" to create your first dish</Text>
          </View>
        ) : (
          filteredItems.map(item => {
            const badge = getStatusBadge(item);
            return (
              <View key={item.id} style={styles.menuCard}>
                <View style={styles.menuCardContent}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.menuImage} />
                  ) : (
                    <View style={[styles.menuImage, styles.menuImagePlaceholder]}>
                      <Ionicons name="image-outline" size={24} color={Colors.gray} />
                    </View>
                  )}
                  <View style={styles.menuInfo}>
                    <View style={styles.menuNameRow}>
                      <Text style={styles.menuName}>{item.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.menuCategory}>{item.category}</Text>
                    {item.description ? (
                      <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <View style={styles.menuBottomRow}>
                      <Text style={styles.menuPrice}>${item.price?.toFixed(2)}</Text>
                      <View style={styles.menuActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                          <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                          <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Edit Menu Item Modal */}
      <Modal visible={!!editItem} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Dish</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Photo */}
              <TouchableOpacity style={styles.editPhotoArea} onPress={pickEditImage}>
                {editImageUri ? (
                  <Image source={{ uri: editImageUri }} style={styles.editPhotoPreview} />
                ) : editItem?.image_url ? (
                  <Image source={{ uri: editItem.image_url }} style={styles.editPhotoPreview} />
                ) : (
                  <View style={styles.editPhotoPlaceholder}>
                    <Ionicons name="camera-outline" size={24} color={Colors.gray} />
                  </View>
                )}
                <View style={styles.editPhotoOverlay}>
                  <Ionicons name="camera" size={16} color={Colors.white} />
                </View>
              </TouchableOpacity>

              {/* Name */}
              <Text style={styles.editLabel}>Dish Name *</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Dish name"
                placeholderTextColor={Colors.gray}
              />

              {/* Description */}
              <Text style={styles.editLabel}>Description</Text>
              <TextInput
                style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Brief description"
                placeholderTextColor={Colors.gray}
                multiline
              />

              {/* Category & Price */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Category *</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editCategory}
                    onChangeText={setEditCategory}
                    placeholder="e.g. Main"
                    placeholderTextColor={Colors.gray}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Price *</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editPrice}
                    onChangeText={(t) => setEditPrice(t.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={Colors.gray}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Availability */}
              <Text style={styles.editLabel}>Availability</Text>
              <View style={styles.editAvailRow}>
                {([
                  { key: 'available' as const, label: 'Available', bg: '#4A6741' },
                  { key: 'sold_out' as const, label: 'Sold Out', bg: '#E74C3C' },
                ]).map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.editAvailChip,
                      editAvailability === opt.key && { backgroundColor: opt.bg, borderColor: opt.bg },
                    ]}
                    onPress={() => setEditAvailability(opt.key)}
                  >
                    <Text style={[
                      styles.editAvailText,
                      editAvailability === opt.key && { color: Colors.white },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.editSaveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.editSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.text },
  subtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },
  addButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24,
    marginTop: Platform.OS === 'android' ? 8 : 2,
    // Slight elevation so it stands out on Android
    ...Platform.select({ android: { elevation: 3 }, ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } } }),
  },
  addButtonText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.white, marginLeft: 8 },

  syncCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FDF8E8', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  syncBadge: {
    backgroundColor: 'rgba(231,189,39,0.15)', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginBottom: 12,
  },
  syncBadgeText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 11, color: Colors.text, letterSpacing: 0.5 },
  syncRestaurantName: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.text, marginBottom: 4 },
  syncDesc: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginBottom: 16 },
  syncStats: { flexDirection: 'row', gap: 10 },
  syncStatItem: {
    backgroundColor: Colors.white, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: Colors.border, minWidth: 80,
  },
  syncStatValue: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.text },
  syncStatLabel: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, marginLeft: 10, fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: Colors.text,
  },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.text, marginTop: 12 },
  emptySubtext: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },

  menuCard: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  menuCardContent: { flexDirection: 'row', gap: 14 },
  menuImage: { width: 70, height: 70, borderRadius: 35 },
  menuImagePlaceholder: {
    backgroundColor: '#F0EFDF', alignItems: 'center', justifyContent: 'center',
  },
  menuInfo: { flex: 1 },
  menuNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuName: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.text, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 12 },
  menuCategory: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 2 },
  menuDesc: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },
  menuBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
  menuPrice: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.primary },
  menuActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5F0E0', alignItems: 'center', justifyContent: 'center',
  },

  /* Edit Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.text,
  },
  editPhotoArea: {
    width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 20, position: 'relative',
  },
  editPhotoPreview: {
    width: 80, height: 80, borderRadius: 40,
  },
  editPhotoPlaceholder: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0EFDF',
    alignItems: 'center', justifyContent: 'center',
  },
  editPhotoOverlay: {
    position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  editLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, color: Colors.text, marginBottom: 6,
  },
  editInput: {
    backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14, color: Colors.text, marginBottom: 14,
  },
  editAvailRow: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
  },
  editAvailChip: {
    flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  editAvailText: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, color: Colors.text,
  },
  editSaveBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
  },
  editSaveBtnText: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 15, color: Colors.text,
  },
});
