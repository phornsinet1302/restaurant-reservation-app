import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { convertToJpeg } from '@/utils/imageUtils';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Availability = 'available' | 'sold_out';

export default function AddMenuItemScreen() {
  const { toast, confirm } = useAppToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('7.50');
  const [availability, setAvailability] = useState<Availability>('available');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    loadRestaurantId();
  }, []);

  const loadRestaurantId = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ [loadRestaurantId] No token found');
        return;
      }

      console.log('🍽️ [loadRestaurantId] Fetching restaurant for merchant...');
      const url = `${API_CONFIG.BASE_URL}/api/restaurants/merchant/my-restaurant`;
      console.log('   URL:', url);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('📊 [loadRestaurantId] Response:', response.data);

      if (response.data?.data?.id) {
        console.log('✅ Restaurant found:', response.data.data.id);
        setRestaurantId(response.data.data.id);
      } else {
        console.error('❌ No restaurant ID in response:', response.data);
        toast('Could not find your restaurant. Please create one first.', 'error');
      }
    } catch (error: any) {
      console.error('❌ [loadRestaurantId] Error:', error.message);
      console.error('   Status:', error.response?.status);
      console.error('   Data:', error.response?.data);
      toast('Failed to load your restaurant', 'error');
    }
  };

  const adjustPrice = (delta: number) => {
    const current = parseFloat(price) || 0;
    const newPrice = Math.max(0, current + delta);
    setPrice(newPrice.toFixed(2));
  };

  const pickImage = async () => {
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
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      toast('Please add a photo of the dish', 'error');
      return;
    }
    if (!name.trim()) {
      toast('Please enter a dish name', 'error');
      return;
    }
    if (!category.trim()) {
      toast('Please enter a category (e.g. Main, Starter, Dessert)', 'error');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      toast('Please enter a valid price', 'error');
      return;
    }
    if (!restaurantId) {
      toast('Restaurant not found. Please try again.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');

      let imageUrl: string | null = null;

      // Upload image to backend if one was selected
      if (imageUri) {
        console.log('📸 [handleSubmit] Uploading image...');

        const jpegUri = await convertToJpeg(imageUri);
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
          console.log('✅ Image uploaded:', imageUrl);
        } catch (uploadError: any) {
          console.warn('⚠️ Image upload failed, continuing without image:', uploadError.message);
          // Continue without image
        }
      }

      const payload: any = {
        restaurant_id: restaurantId,
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || 'Main',
        price: parseFloat(price),
        image_url: imageUrl,
        is_available: availability !== 'sold_out',
      };

      console.log('📤 [handleSubmit] Submitting menu item:', payload);

      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/menu`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('✅ [handleSubmit] Success:', response.data);

      toast('Menu item added successfully!', 'success');
      router.back();
    } catch (error: any) {
      console.error('❌ [handleSubmit] Error:', error.response?.data || error.message);
      const msg = error?.response?.data?.error || 'Failed to add menu item';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const availabilityOptions: { key: Availability; label: string; activeColor: string; activeBg: string }[] = [
    { key: 'available', label: 'Available', activeColor: Colors.white, activeBg: '#4A6741' },
    { key: 'sold_out', label: 'Sold Out', activeColor: Colors.white, activeBg: '#E74C3C' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Add New Dish</Text>
          <Text style={styles.subtitle}>This dish will appear on your customer-facing menu</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Upload */}
        <TouchableOpacity style={styles.photoArea} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
          ) : (
            <>
              <View style={styles.cameraIcon}>
                <Ionicons name="camera-outline" size={28} color={Colors.gray} />
              </View>
              <Text style={styles.photoTitle}>Add a photo of this dish</Text>
              <Text style={styles.photoSubtitle}>Tap to upload from your device</Text>
              <View style={styles.choosePhotoBtn}>
                <Ionicons name="images-outline" size={16} color={Colors.primary} />
                <Text style={styles.choosePhotoText}>Choose Photo</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

        {/* Dish Name */}
        <Text style={styles.label}>Dish Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Fish Amok"
          placeholderTextColor={Colors.gray}
          value={name}
          onChangeText={setName}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Briefly describe the dish, ingredients, or style"
          placeholderTextColor={Colors.gray}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Category & Price row */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Main, Starter"
              placeholderTextColor={Colors.gray}
              value={category}
              onChangeText={setCategory}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Price</Text>
            <View style={styles.priceRow}>
              <TouchableOpacity style={styles.priceArrow} onPress={() => adjustPrice(-1)}>
                <Ionicons name="remove" size={18} color={Colors.text} />
              </TouchableOpacity>
              <TextInput
                style={styles.priceInput}
                value={'$' + price}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  setPrice(cleaned);
                }}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity style={styles.priceArrow} onPress={() => adjustPrice(1)}>
                <Ionicons name="add" size={18} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Availability */}
        <Text style={styles.label}>Availability</Text>
        <View style={styles.availabilityRow}>
          {availabilityOptions.map(opt => {
            const isActive = availability === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.availChip,
                  isActive && { backgroundColor: opt.activeBg, borderColor: opt.activeBg },
                ]}
                onPress={() => setAvailability(opt.key)}
              >
                <Text style={[
                  styles.availText,
                  isActive && { color: opt.activeColor },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Add to Menu</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 22, color: Colors.text },
  subtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 2 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },

  /* Photo upload */
  photoArea: {
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 16, padding: 28, alignItems: 'center', marginBottom: 24,
    backgroundColor: '#FEFCF4',
  },
  cameraIcon: { marginBottom: 10 },
  photoTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: Colors.text, marginBottom: 4 },
  photoSubtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginBottom: 14 },
  choosePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.primary,
  },
  choosePhotoText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, color: Colors.primary },
  photoPreview: { width: '100%', height: 200, borderRadius: 12 },

  /* Form fields */
  label: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.text, marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  row: { flexDirection: 'row', gap: 14 },
  halfField: { flex: 1 },

  /* Price with arrows */
  priceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
    overflow: 'hidden',
  },
  priceArrow: {
    width: 42, height: 48, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5F0E0',
  },
  priceInput: {
    flex: 1, textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Medium', fontSize: 14, color: Colors.text,
    paddingVertical: 14,
  },

  /* Availability chips */
  availabilityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  availChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  availText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, color: Colors.text },

  /* Bottom bar */
  bottomBar: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.white },
});
