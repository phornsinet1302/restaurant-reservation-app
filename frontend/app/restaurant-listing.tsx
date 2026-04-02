import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
  Modal as RNModal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'; // TEMPORARILY DISABLED FOR EXPO GO
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ─── Types ─── */
type VenueType = 'Restaurant' | 'Pub' | 'Cafe' | 'Night club';

/* ─── Time Picker Component ─── */
const TimePicker = ({
  selectedHour,
  selectedMinute,
  selectedPeriod,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}: {
  selectedHour: number;
  selectedMinute: string;
  selectedPeriod: 'AM' | 'PM';
  onHourChange: (h: number) => void;
  onMinuteChange: (m: string) => void;
  onPeriodChange: (p: 'AM' | 'PM') => void;
}) => {
  const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutes = [':00', ':15', ':30', ':45'];

  return (
    <View>
      {/* Hours row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeRow}>
        {hours.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.timeChip, selectedHour === h && styles.timeChipActive]}
            onPress={() => onHourChange(h)}
          >
            <Text style={[styles.timeChipText, selectedHour === h && styles.timeChipTextActive]}>
              {h}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Minutes + AM/PM row */}
      <View style={styles.minuteRow}>
        {minutes.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.timeChip, selectedMinute === m && styles.timeChipSelected]}
            onPress={() => onMinuteChange(m)}
          >
            <Text style={[styles.timeChipText, selectedMinute === m && styles.timeChipSelectedText]}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.timeChip, selectedPeriod === 'AM' && styles.timeChipActive]}
          onPress={() => onPeriodChange('AM')}
        >
          <Text style={[styles.timeChipText, selectedPeriod === 'AM' && styles.timeChipTextActive]}>
            AM
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeChip, selectedPeriod === 'PM' && styles.timeChipSelected]}
          onPress={() => onPeriodChange('PM')}
        >
          <Text style={[styles.timeChipText, selectedPeriod === 'PM' && styles.timeChipSelectedText]}>
            PM
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── Format display time ─── */
const formatTime = (hour: number, minute: string, period: 'AM' | 'PM') =>
  `${hour}${minute}${period.toLowerCase()}`;

/* ─── Main Screen ─── */
export default function RestaurantListingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Basic details
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineLine, setCuisineLine] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');

  // Venue type
  const venueTypes: VenueType[] = ['Restaurant', 'Pub', 'Cafe', 'Night club'];
  const [selectedVenueType, setSelectedVenueType] = useState<VenueType>('Restaurant');

  // Booking details
  const [address, setAddress] = useState('');

  // Opening until
  const [openHour, setOpenHour] = useState(10);
  const [openMinute, setOpenMinute] = useState(':00');
  const [openPeriod, setOpenPeriod] = useState<'AM' | 'PM'>('AM');

  // Closing until
  const [closeHour, setCloseHour] = useState(10);
  const [closeMinute, setCloseMinute] = useState(':00');
  const [closePeriod, setClosePeriod] = useState<'AM' | 'PM'>('PM');

  // Status
  const [isOpen, setIsOpen] = useState(true);

  // Bookable time slots
  const [slotHour, setSlotHour] = useState(12);
  const [slotMinute, setSlotMinute] = useState(':00');
  const [slotPeriod, setSlotPeriod] = useState<'AM' | 'PM'>('PM');
  const [timeSlots, setTimeSlots] = useState<string[]>([
    '11:30am', '12:30pm', '1:30pm', '6:00pm', '7:00pm', '8:00pm',
  ]);

  // Discoverability
  const [searchTags, setSearchTags] = useState('');

  // Cover image
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Menu photos
  interface MenuPhoto {
    id: string;
    photo_url: string;
    title: string;
    display_order: number;
  }
  const [menuPhotos, setMenuPhotos] = useState<MenuPhoto[]>([]);
  const [uploadingMenuPhoto, setUploadingMenuPhoto] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string>('');

  // Publishing
  const [publishing, setPublishing] = useState(false);
  const [token, setToken] = useState('');

  // Location
  const [latitude, setLatitude] = useState(11.5564); // Default: Phnom Penh
  const [longitude, setLongitude] = useState(104.9282);
  const [mapRegion, setMapRegion] = useState({
    latitude: 11.5564,
    longitude: 104.9282,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [displayAddress, setDisplayAddress] = useState('');

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadMenuPhotos = async (restId: string) => {
    try {
      if (!restId) {
        console.warn('[loadMenuPhotos] No restaurant ID provided');
        return;
      }
      const endpoint = `${API_CONFIG.BASE_URL}/api/menu-photos/${restId}`;
      console.log(`[loadMenuPhotos] Fetching from: ${endpoint}`);
      const res = await axios.get(endpoint);
      setMenuPhotos(res.data.data || []);
      console.log(`[loadMenuPhotos] Loaded ${res.data.data?.length || 0} photos`);
    } catch (error: any) {
      console.log('Loading menu photos error:', error.message);
    }
  };

  const pickMenuPhoto = async (photoIndex: number) => {
    try {
      console.log(`[pickMenuPhoto] Opening image picker for photo slot ${photoIndex}`);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log(`[pickMenuPhoto] Picker result:`, {
        canceled: result.canceled,
        hasAssets: !!result.assets,
        assetCount: result.assets?.length || 0,
      });

      if (result.canceled) {
        console.log('[pickMenuPhoto] User cancelled image selection');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Error', 'No image was selected');
        return;
      }

      const selectedImage = result.assets[0];
      console.log(`[pickMenuPhoto] Selected image URI:`, selectedImage.uri);
      
      await uploadMenuPhoto(selectedImage.uri, photoIndex);
    } catch (error: any) {
      console.error('Image picker error:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
      });
      Alert.alert('Error', `Failed to pick image: ${error?.message || 'Unknown error'}`);
    }
  };

  const uploadMenuPhoto = async (imageUri: string, displayOrder: number) => {
    try {
      if (!restaurantId || !token) {
        Alert.alert('Error', 'Restaurant not found. Please refresh.');
        return;
      }

      setUploadingMenuPhoto(true);
      
      console.log(`[uploadMenuPhoto] Starting upload for restaurant: ${restaurantId}`);
      console.log(`[uploadMenuPhoto] Image URI: ${imageUri}`);
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `menu-photo-${displayOrder}-${Date.now()}.jpg`,
      } as any);
      formData.append('title', `Menu Photo ${displayOrder}`);
      formData.append('display_order', displayOrder.toString());

      const endpoint = `${API_CONFIG.BASE_URL}/api/menu-photos/${restaurantId}`;
      console.log(`[uploadMenuPhoto] Calling endpoint: ${endpoint}`);
      console.log(`[uploadMenuPhoto] Token present: ${!!token}`);
      
      const uploadRes = await axios.post(
        endpoint,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log(`[uploadMenuPhoto] Response:`, uploadRes.data);
      
      if (uploadRes.data?.data) {
        await loadMenuPhotos(restaurantId);
        Alert.alert('Success', 'Menu photo uploaded!');
      } else if (uploadRes.data?.success) {
        await loadMenuPhotos(restaurantId);
        Alert.alert('Success', 'Menu photo uploaded!');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Upload error details:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
      });
      
      // Handle specific error cases
      if (error?.response?.status === 404) {
        Alert.alert('Error', 'API endpoint not found. Make sure backend is running on port 3000.');
      } else if (error?.response?.status === 401) {
        Alert.alert('Error', 'Unauthorized. Please log in again.');
      } else if (error?.response?.status === 403) {
        Alert.alert('Error', 'This is not your restaurant.');
      } else if (error?.response?.status === 400) {
        const msg = error?.response?.data?.error || 'Invalid request';
        Alert.alert('Error', msg);
      } else if (error?.code === 'ECONNREFUSED') {
        Alert.alert('Error', 'Cannot connect to backend. Is the server running on port 3000?');
      } else {
        const msg = error?.response?.data?.error || error?.message || 'Failed to upload photo';
        Alert.alert('Error', msg);
      }
    } finally {
      setUploadingMenuPhoto(false);
    }
  };

  const deleteMenuPhoto = async (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Remove this menu photo?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              if (!token) {
                Alert.alert('Error', 'Not authenticated');
                return;
              }

              await axios.delete(
                `${API_CONFIG.BASE_URL}/api/menu-photos/${photoId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              await loadMenuPhotos(restaurantId);
              Alert.alert('Success', 'Photo removed');
            } catch (error: any) {
              const msg = error?.response?.data?.error || 'Failed to delete';
              Alert.alert('Error', msg);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const pickCoverImage = async () => {
    try {
      console.log('[pickCoverImage] Launching image library...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      console.log('[pickCoverImage] Picker result:', {
        canceled: result.canceled,
        hasAssets: !!result.assets,
        assetCount: result.assets?.length || 0,
      });

      if (result.canceled) {
        console.log('[pickCoverImage] User cancelled image selection');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        Alert.alert('Error', 'No image was selected');
        return;
      }

      const selectedImage = result.assets[0];
      console.log('[pickCoverImage] Selected image URI:', selectedImage.uri);
      
      setPreviewImage(selectedImage.uri);
      setShowImagePreview(true);
    } catch (error: any) {
      console.error('Image picker error:', error);
      console.error('Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
      });
      Alert.alert('Error', `Failed to pick image: ${error?.message || 'Unknown error'}`);
    }
  };

  const uploadCoverImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: `cover-${Date.now()}.jpg`,
      } as any);

      const uploadRes = await axios.post(
        `${API_CONFIG.BASE_URL}/api/media/upload-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const imageUrl = uploadRes.data?.image_url;
      if (imageUrl) {
        setCoverImage(imageUrl);
        setShowImagePreview(false);
        Alert.alert('Success', 'Cover image updated! Tap "Publish" to save changes.');
        return imageUrl;
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const loadRestaurantData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken || '');
      
      if (!storedToken) return;

      const dashRes = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (user) {
        // Try to load restaurant details from merchant endpoint
        const restRes = await axios.get(
          `${API_CONFIG.BASE_URL}/api/restaurants/merchant/my-restaurant`,
          { headers: { Authorization: `Bearer ${storedToken}` } }
        );
        
        const myRestaurant = restRes.data?.data;
        if (myRestaurant) {
          setRestaurantId(myRestaurant.id);
          console.log(`[loadRestaurantData] Loaded restaurant ID: ${myRestaurant.id}`);
          setRestaurantName(myRestaurant.name || '');
          setCuisineLine(myRestaurant.cuisine || myRestaurant.category || '');
          setDescription(myRestaurant.description || '');
          setAddress(myRestaurant.address || '');
          setPhone(myRestaurant.phone || '');
          setSearchTags(myRestaurant.cuisine || '');
          if (myRestaurant.image_url) setCoverImage(myRestaurant.image_url);
          
          // Load menu photos
          await loadMenuPhotos(myRestaurant.id);
          
          // Parse opening hours (e.g., "10:00am" → hour: 10, minute: :00, period: AM)
          if (myRestaurant.opening_hours) {
            const match = myRestaurant.opening_hours.match(/(\d+)(:?\d*)(am|pm)/i);
            if (match) {
              setOpenHour(parseInt(match[1]));
              setOpenMinute(match[2] || ':00');
              setOpenPeriod((match[3].toUpperCase() as 'AM' | 'PM'));
            }
          }
          
          // Parse closing hours
          if (myRestaurant.closing_hours) {
            const match = myRestaurant.closing_hours.match(/(\d+)(:?\d*)(am|pm)/i);
            if (match) {
              setCloseHour(parseInt(match[1]));
              setCloseMinute(match[2] || ':00');
              setClosePeriod((match[3].toUpperCase() as 'AM' | 'PM'));
            }
          }

          // Load location coordinates
          if (myRestaurant.latitude && myRestaurant.longitude) {
            const lat = parseFloat(myRestaurant.latitude);
            const lng = parseFloat(myRestaurant.longitude);
            setLatitude(lat);
            setLongitude(lng);
            setMapRegion({
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }
      }
    } catch (error) {
      console.log('Loading restaurant data...');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = () => {
    const newSlot = formatTime(slotHour, slotMinute, slotPeriod);
    if (!timeSlots.includes(newSlot)) {
      setTimeSlots(prev => [...prev, newSlot]);
    }
  };

  const removeTimeSlot = (slot: string) => {
    setTimeSlots(prev => prev.filter(s => s !== slot));
  };

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (addresses.length > 0) {
        const addr = addresses[0];
        const formatted = `${addr.street || ''} ${addr.city || ''}, ${addr.region || ''}`.trim();
        setDisplayAddress(formatted);
      }
    } catch (error) {
      console.log('Geocode error:', error);
    }
  };

  const handleMapPress = (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lng);
    setMapRegion({
      ...mapRegion,
      latitude: lat,
      longitude: lng,
    });
    getAddressFromCoordinates(lat, lng);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission required');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      setLatitude(lat);
      setLongitude(lng);
      setMapRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      await getAddressFromCoordinates(lat, lng);
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    }
  };

  const handleSave = async () => {
    // Validate all required fields
    if (!restaurantName.trim()) {
      Alert.alert('Error', 'Restaurant name is required');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Address is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }
    if (!cuisineLine.trim()) {
      Alert.alert('Error', 'Cuisine/Category is required');
      return;
    }

    setSaving(true);
    try {
      if (!token) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const openingHours = formatTime(openHour, openMinute, openPeriod);
      const closingHours = formatTime(closeHour, closeMinute, closePeriod);

      const restaurantData = {
        name: restaurantName.trim(),
        cuisine: cuisineLine.trim(),
        description: description.trim(),
        address: address.trim(),
        category: selectedVenueType,
        phone: phone.trim(),
        opening_hours: openingHours,
        closing_hours: closingHours,
        latitude,
        longitude,
      };

      try {
        // Try to update existing restaurant
        await axios.put(
          `${API_CONFIG.BASE_URL}/api/restaurants/merchant/my-restaurant`,
          restaurantData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Alert.alert('Success', 'Listing saved successfully!');
      } catch (updateError: any) {
        // If restaurant doesn't exist, create it first
        if (updateError?.response?.status === 404 && updateError?.response?.data?.error?.includes('not found')) {
          console.log('Restaurant not found, creating new restaurant...');
          await axios.post(
            `${API_CONFIG.BASE_URL}/api/restaurants`,
            restaurantData,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          Alert.alert('Success', 'Restaurant created and saved successfully!');
        } else {
          throw updateError;
        }
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to save changes';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    // Validate all required fields before publishing
    if (!restaurantName.trim() || !description.trim() || !address.trim() || 
        !phone.trim() || !cuisineLine.trim()) {
      Alert.alert('Error', 'Please fill in all required fields before publishing');
      return;
    }

    Alert.alert(
      'Publish Restaurant',
      'Make this restaurant visible to all customers for booking?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Publish',
          onPress: async () => {
            setPublishing(true);
            try {
              if (!token) {
                Alert.alert('Error', 'Please log in again');
                return;
              }

              // Prepare restaurant data
              const openingHours = formatTime(openHour, openMinute, openPeriod);
              const closingHours = formatTime(closeHour, closeMinute, closePeriod);

              const restaurantData = {
                name: restaurantName.trim(),
                cuisine: cuisineLine.trim(),
                description: description.trim(),
                address: address.trim(),
                category: selectedVenueType,
                phone: phone.trim(),
                opening_hours: openingHours,
                closing_hours: closingHours,
                latitude,
                longitude,
                image_url: coverImage || undefined,
              };

              try {
                // Try to update existing restaurant
                await axios.put(
                  `${API_CONFIG.BASE_URL}/api/restaurants/merchant/my-restaurant`,
                  restaurantData,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              } catch (updateError: any) {
                // If restaurant doesn't exist, create it first
                if (updateError?.response?.status === 404 && updateError?.response?.data?.error?.includes('not found')) {
                  console.log('Restaurant not found, creating new restaurant...');
                  await axios.post(
                    `${API_CONFIG.BASE_URL}/api/restaurants`,
                    restaurantData,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                } else {
                  throw updateError;
                }
              }

              // Then publish
              await axios.post(
                `${API_CONFIG.BASE_URL}/api/restaurants/merchant/publish`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );

              Alert.alert('Success', 'Your restaurant is now live for customer bookings!', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error: any) {
              const msg = error?.response?.data?.error || 'Failed to publish';
              Alert.alert('Error', msg);
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Restaurant Listing</Text>
          <Text style={styles.headerSubtitle}>Update the profile customers browse and book</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Customer-Facing Profile Preview ─── */}
        <View style={styles.previewCard}>
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
            style={styles.previewGradient}
          >
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.previewImage} />
            ) : (
              <Image
                source={require('@/assets/images/hero-restaurant.jpg')}
                style={styles.previewImage}
              />
            )}
            <View style={styles.previewOverlay}>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>CUSTOMER-FACING PROFILE</Text>
              </View>
              <TouchableOpacity 
                style={styles.editImageBtn}
                onPress={() => {
                  if (!token) {
                    Alert.alert('Error', 'Please log in first');
                    return;
                  }
                  pickCoverImage();
                }}
              >
                <Ionicons name="image-outline" size={20} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.previewLabel}>PREVIEW</Text>
              <Text style={styles.previewName}>{restaurantName || 'Your Restaurant'}</Text>
              <Text style={styles.previewAddress}>{address || 'Address'}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>This is what customers see</Text>
          <Text style={styles.infoSub}>
            Search results, restaurant detail, booking checkout, and saved favorites all read from this listing.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtnOutline}>
            <Ionicons name="eye-outline" size={18} color={Colors.text} />
            <Text style={styles.actionBtnOutlineText}>Preview page</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnFilled}
            onPress={() => router.push('/(merchant-tabs)/menu' as any)}
          >
            <Ionicons name="sparkles" size={18} color={Colors.white} />
            <Text style={styles.actionBtnFilledText}>Manage menu</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Section: Basic Details ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="home-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Basic details</Text>
          </View>

          <Text style={styles.label}>Restaurant name</Text>
          <TextInput
            style={styles.input}
            value={restaurantName}
            onChangeText={setRestaurantName}
            placeholder="Your restaurant name"
            placeholderTextColor={Colors.gray}
          />

          <Text style={styles.label}>Cuisine line</Text>
          <TextInput
            style={styles.input}
            value={cuisineLine}
            onChangeText={setCuisineLine}
            placeholder="e.g. Khmer restaurant • Family dining"
            placeholderTextColor={Colors.gray}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your restaurant..."
            placeholderTextColor={Colors.gray}
            multiline
            textAlignVertical="top"
          />

          {/* Venue Type */}
          <Text style={styles.label}>Venue type</Text>
          <View style={styles.chipRow}>
            {venueTypes.map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.chip, selectedVenueType === v && styles.chipActive]}
                onPress={() => setSelectedVenueType(v)}
              >
                <Text style={[styles.chipText, selectedVenueType === v && styles.chipTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>


        </View>

        {/* ─── Section: Location (Map Disabled for Expo Go) ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Pin your location</Text>
          </View>

          <Text style={styles.label}>Location coordinates (map coming in development build)</Text>
          
          <TouchableOpacity
            style={[styles.timeChip, { width: '100%', marginRight: 0, marginVertical: 12 }]}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={20} color={Colors.primary} />
            <Text style={[styles.timeChipText, { marginLeft: 8 }]}>Detect current location</Text>
          </TouchableOpacity>

          {displayAddress ? (
            <View style={styles.addressBox}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              <Text style={styles.addressText}>{displayAddress}</Text>
            </View>
          ) : (
            <View style={styles.addressBox}>
              <Ionicons name="information-circle" size={18} color={Colors.gray} />
              <Text style={styles.addressText}>Tap locate button to detect your restaurant location</Text>
            </View>
          )}

          <Text style={styles.coordinates}>
            Latitude: {latitude.toFixed(4)} | Longitude: {longitude.toFixed(4)}
          </Text>
        </View>

        {/* ─── Section: Booking Details ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Booking details</Text>
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={address}
            onChangeText={setAddress}
            placeholder="Your restaurant address"
            placeholderTextColor={Colors.gray}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Your restaurant phone number"
            placeholderTextColor={Colors.gray}
            keyboardType="phone-pad"
          />

          {/* Opening Hours */}
          <Text style={styles.label}>Opening hours</Text>
          <TimePicker
            selectedHour={openHour}
            selectedMinute={openMinute}
            selectedPeriod={openPeriod}
            onHourChange={setOpenHour}
            onMinuteChange={setOpenMinute}
            onPeriodChange={setOpenPeriod}
          />
          <Text style={styles.selectedTime}>
            Selected: <Text style={styles.selectedTimeBold}>
              {formatTime(openHour, openMinute, openPeriod)}
            </Text>
          </Text>

          {/* Closing Hours */}
          <Text style={styles.label}>Closing hours</Text>
          <TimePicker
            selectedHour={closeHour}
            selectedMinute={closeMinute}
            selectedPeriod={closePeriod}
            onHourChange={setCloseHour}
            onMinuteChange={setCloseMinute}
            onPeriodChange={setClosePeriod}
          />
          <Text style={styles.selectedTime}>
            Selected: <Text style={styles.selectedTimeBold}>
              {formatTime(closeHour, closeMinute, closePeriod)}
            </Text>
          </Text>

          {/* Status */}
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[styles.statusBtn, isOpen && styles.statusBtnActive]}
              onPress={() => setIsOpen(true)}
            >
              <Text style={[styles.statusBtnText, isOpen && styles.statusBtnTextActive]}>
                Open
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusBtn, !isOpen && styles.statusBtnActive]}
              onPress={() => setIsOpen(false)}
            >
              <Text style={[styles.statusBtnText, !isOpen && styles.statusBtnTextActive]}>
                Closed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bookable Time Slots */}
          <Text style={styles.label}>Bookable time slots</Text>
          <Text style={styles.sublabel}>Tap a slot to remove it</Text>

          <TimePicker
            selectedHour={slotHour}
            selectedMinute={slotMinute}
            selectedPeriod={slotPeriod}
            onHourChange={setSlotHour}
            onMinuteChange={setSlotMinute}
            onPeriodChange={setSlotPeriod}
          />

          <View style={styles.slotSelectedRow}>
            <Text style={styles.selectedTime}>
              Selected: <Text style={styles.selectedTimeBold}>
                {formatTime(slotHour, slotMinute, slotPeriod)}
              </Text>
            </Text>
            <TouchableOpacity style={styles.addSlotBtn} onPress={addTimeSlot}>
              <Ionicons name="add" size={18} color={Colors.primary} />
              <Text style={styles.addSlotText}>Add slot</Text>
            </TouchableOpacity>
          </View>

          {/* Slot Chips */}
          <View style={styles.slotChipWrap}>
            {timeSlots.map(slot => (
              <TouchableOpacity
                key={slot}
                style={styles.slotChip}
                onPress={() => removeTimeSlot(slot)}
              >
                <Text style={styles.slotChipText}>{slot}</Text>
                <Ionicons name="close" size={14} color={Colors.gray} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── Section: Discoverability ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="send-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Discoverability</Text>
          </View>

          <Text style={styles.label}>Search tags</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={searchTags}
            onChangeText={setSearchTags}
            placeholder="e.g. Khmer, BKK1, Family dining"
            placeholderTextColor={Colors.gray}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ─── Section: Menu Photos ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images-outline" size={22} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Menu photos (Top 3)</Text>
          </View>

          <Text style={styles.sublabel}>Upload up to 3 menu photos for customers to see</Text>

          {/* Photo Grid */}
          <View style={styles.photoGrid}>
            {[1, 2, 3].map((photoNum) => {
              const photo = menuPhotos.find(p => p.display_order === photoNum);
              return (
                <View key={photoNum} style={styles.photoCard}>
                  {photo ? (
                    <>
                      <Image source={{ uri: photo.photo_url }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.photoDeleteBtn}
                        onPress={() => deleteMenuPhoto(photo.id)}
                      >
                        <Ionicons name="trash" size={18} color={Colors.white} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="image-outline" size={36} color={Colors.gray} />
                      <Text style={styles.photoPlaceholderText}>Photo {photoNum}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.photoUploadBtn}
                    onPress={() => {
                      if (!restaurantId) {
                        Alert.alert('Error', 'Restaurant data not loaded. Please refresh the screen.');
                        return;
                      }
                      pickMenuPhoto(photoNum);
                    }}
                    disabled={uploadingMenuPhoto}
                  >
                    {uploadingMenuPhoto ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Ionicons name={photo ? 'pencil' : 'add'} size={20} color={Colors.white} />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <Text style={styles.photoInfo}>
            📸 Square images work best (1:1 ratio) • Max 10MB per photo
          </Text>
        </View>
      </ScrollView>

      {/* ─── Action Buttons ─── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || publishing) && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving || publishing}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Save changes</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishBtn, (saving || publishing) && { opacity: 0.6 }]}
          onPress={handlePublish}
          disabled={saving || publishing}
        >
          {publishing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Publish for booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Image Preview Modal */}
      <RNModal
        visible={showImagePreview}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowImagePreview(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowImagePreview(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Preview Cover Image</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {/* Image Preview */}
          <ScrollView 
            contentContainerStyle={styles.previewScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {previewImage && (
              <Image 
                source={{ uri: previewImage }} 
                style={styles.largePreviewImage}
              />
            )}
            
            {/* Preview Card */}
            <View style={styles.previewCardModal}>
              <LinearGradient
                colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']}
                style={styles.previewGradientModal}
              >
                {previewImage && (
                  <Image 
                    source={{ uri: previewImage }} 
                    style={styles.previewImageModal}
                  />
                )}
                <View style={styles.previewOverlayModal}>
                  <Text style={styles.previewLabel}>PREVIEW</Text>
                  <Text style={styles.previewName}>{restaurantName || 'Your Restaurant'}</Text>
                  <Text style={styles.previewAddress}>{address || 'Address'}</Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.modalTextContainer}>
              <Text style={styles.modalDescription}>
                This is how your restaurant will appear to customers on the app.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.modalBtnCancel]}
              onPress={() => setShowImagePreview(false)}
              disabled={uploadingImage}
            >
              <Text style={styles.modalBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBtn, styles.modalBtnSave]}
              onPress={() => previewImage && uploadCoverImage(previewImage)}
              disabled={uploadingImage || !previewImage}
            >
              {uploadingImage ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.modalBtnText}>Save Cover Image</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 22, color: Colors.text },
  headerSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13,
    color: Colors.gray, marginTop: 2,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },

  /* Preview Card */
  previewCard: {
    borderRadius: 20, overflow: 'hidden', marginBottom: 16, height: 200,
  },
  previewGradient: { flex: 1 },
  previewImage: {
    ...StyleSheet.absoluteFillObject, width: '100%', height: '100%',
    borderRadius: 20,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20, padding: 18, justifyContent: 'flex-end',
  },
  previewBadge: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  previewBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 10,
    color: Colors.white, letterSpacing: 1,
  },
  editImageBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  previewLabel: {
    fontFamily: 'PlusJakartaSans-Medium', fontSize: 11,
    color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4,
  },
  previewName: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 24, color: Colors.white,
  },
  previewAddress: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13,
    color: 'rgba(255,255,255,0.85)', marginTop: 2,
  },

  /* Info box */
  infoBox: {
    backgroundColor: '#F5F0E0', borderRadius: 14, padding: 18, marginBottom: 16,
  },
  infoTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.text,
    marginBottom: 4,
  },
  infoSub: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray,
    lineHeight: 19,
  },

  /* Action buttons */
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 30, paddingVertical: 13,
    backgroundColor: Colors.white,
  },
  actionBtnOutlineText: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.text,
  },
  actionBtnFilled: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 30, paddingVertical: 13,
  },
  actionBtnFilledText: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.white,
  },

  /* Sections */
  section: {
    backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    padding: 22, marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 17, color: Colors.text,
  },

  /* Form */
  label: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, color: Colors.gray,
    marginBottom: 8, marginTop: 4,
  },
  sublabel: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray,
    marginBottom: 10, marginTop: -4,
  },
  input: {
    backgroundColor: Colors.background, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 18,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },

  /* Venue type chips */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: {
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 24,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  chipActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, color: Colors.text,
  },
  chipTextActive: { color: Colors.white },

  /* Time picker */
  timeRow: { marginBottom: 10 },
  minuteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  timeChip: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8,
  },
  timeChipActive: {
    backgroundColor: Colors.text, borderColor: Colors.text,
  },
  timeChipTextActive: { color: Colors.white },
  timeChipSelected: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  timeChipSelectedText: { color: Colors.white },
  timeChipText: {
    fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, color: Colors.text,
  },

  selectedTime: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13,
    color: Colors.gray, marginTop: 6, marginBottom: 18,
  },
  selectedTimeBold: {
    fontFamily: 'PlusJakartaSans-Bold', color: Colors.text,
  },

  /* Status toggle */
  statusRow: {
    flexDirection: 'row', gap: 0, marginBottom: 24,
    borderRadius: 30, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  statusBtn: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    backgroundColor: Colors.background,
  },
  statusBtnActive: { backgroundColor: '#4A6741' },
  statusBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.text,
  },
  statusBtnTextActive: { color: Colors.white },

  /* Slot chips */
  slotSelectedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4, marginBottom: 14,
  },
  addSlotBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F0E0', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  addSlotText: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, color: Colors.primary,
  },
  slotChipWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  slotChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  slotChipText: {
    fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, color: Colors.text,
  },

  /* Action bar */
  bottomBar: { 
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 
  },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary,
    borderRadius: 16, paddingVertical: 18,
  },
  publishBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.success,
    borderRadius: 16, paddingVertical: 18,
  },
  saveBtnText: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 14, color: Colors.white,
  },

  /* Location map */
  mapContainer: {
    height: 300, borderRadius: 12, overflow: 'hidden',
    marginVertical: 12, borderWidth: 1, borderColor: Colors.border,
  },
  map: { width: '100%', height: '100%' },
  currentLocationButton: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: Colors.white, borderRadius: 24,
    width: 48, height: 48, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84,
    elevation: 5, borderWidth: 1, borderColor: Colors.border,
  },
  addressBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, padding: 12,
    borderRadius: 8, marginVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  addressText: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13,
    color: Colors.text, flex: 1,
  },
  coordinates: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 11,
    color: Colors.gray, marginTop: 8, textAlign: 'center',
  },

  /* Image Preview Modal */
  modalContainer: {
    flex: 1, backgroundColor: Colors.background, paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  modalCloseBtn: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
  },
  modalHeaderSpacer: { width: 40 },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, color: Colors.text,
  },
  previewScrollContent: { paddingHorizontal: 20, paddingVertical: 16 },
  largePreviewImage: {
    width: '100%', height: 200, borderRadius: 16, marginBottom: 20,
  },
  previewCardModal: {
    backgroundColor: Colors.white, borderRadius: 16,
    overflow: 'hidden', marginBottom: 20, height: 200,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewGradientModal: { flex: 1 },
  previewImageModal: {
    position: 'absolute', width: '100%', height: '100%',
  },
  previewOverlayModal: {
    flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 16,
  },
  modalTextContainer: {
    backgroundColor: Colors.white, borderRadius: 12,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalDescription: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13,
    color: Colors.gray, lineHeight: 19,
  },
  modalButtonContainer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 20,
    paddingVertical: 16, paddingBottom: 32,
  },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
  },
  modalBtnSave: {
    backgroundColor: Colors.primary,
  },
  modalBtnTextCancel: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.text,
  },
  modalBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.white,
  },

  /* Menu Photos */
  photoGrid: {
    flexDirection: 'row', gap: 12, marginBottom: 16, marginTop: 16,
  },
  photoCard: {
    flex: 1, aspectRatio: 1, borderRadius: 14,
    overflow: 'hidden', backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.border,
  },
  photoImage: {
    width: '100%', height: '100%',
  },
  photoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  photoPlaceholderText: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 11,
    color: Colors.gray, marginTop: 6,
  },
  photoUploadBtn: {
    position: 'absolute', bottom: 8, right: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 5,
  },
  photoDeleteBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 5,
  },
  photoInfo: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 12,
    color: Colors.gray, marginTop: 8,
  },
});
