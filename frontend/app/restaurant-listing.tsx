import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'; // TEMPORARILY DISABLED FOR EXPO GO
import * as Location from 'expo-location';
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
          setRestaurantName(myRestaurant.name || '');
          setCuisineLine(myRestaurant.cuisine || myRestaurant.category || '');
          setDescription(myRestaurant.description || '');
          setAddress(myRestaurant.address || '');
          setPhone(myRestaurant.phone || '');
          setSearchTags(myRestaurant.cuisine || '');
          if (myRestaurant.image_url) setCoverImage(myRestaurant.image_url);
          
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
              <TouchableOpacity style={styles.editImageBtn}>
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
});
