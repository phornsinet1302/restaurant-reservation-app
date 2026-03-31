import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { LinearGradient } from 'expo-linear-gradient';

/* ─── Types ─── */
type VenueType = 'Restaurant' | 'Pub' | 'Cafe' | 'Night club';
type PriceRange = '$' | '$$' | '$$$' | '$$$$';

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

  // Venue type
  const venueTypes: VenueType[] = ['Restaurant', 'Pub', 'Cafe', 'Night club'];
  const [selectedVenueType, setSelectedVenueType] = useState<VenueType>('Restaurant');

  // Price range
  const priceRanges: PriceRange[] = ['$', '$$', '$$$', '$$$$'];
  const [selectedPrice, setSelectedPrice] = useState<PriceRange>('$$');

  // Booking details
  const [address, setAddress] = useState('');

  // Open until
  const [openHour, setOpenHour] = useState(10);
  const [openMinute, setOpenMinute] = useState(':00');
  const [openPeriod, setOpenPeriod] = useState<'AM' | 'PM'>('PM');

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

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadRestaurantData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const dashRes = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (user) {
        // Try to load restaurant details
        const restRes = await axios.get(`${API_CONFIG.BASE_URL}/api/restaurants`);
        const myRestaurant = restRes.data?.find?.((r: any) => r.merchant_id === user.id);
        if (myRestaurant) {
          setRestaurantName(myRestaurant.name || '');
          setCuisineLine(myRestaurant.cuisine || myRestaurant.category || '');
          setDescription(myRestaurant.description || '');
          setAddress(myRestaurant.address || '');
          setSearchTags(myRestaurant.cuisine || '');
          if (myRestaurant.image_url) setCoverImage(myRestaurant.image_url);
        }
      }
    } catch {
      // silent
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

  const handleSave = async () => {
    if (!restaurantName.trim()) {
      Alert.alert('Error', 'Restaurant name is required');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!token || !user) {
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Get restaurant ID
      const restRes = await axios.get(`${API_CONFIG.BASE_URL}/api/restaurants`);
      const myRestaurant = restRes.data?.find?.((r: any) => r.merchant_id === user.id);

      if (myRestaurant) {
        await axios.put(
          `${API_CONFIG.BASE_URL}/api/restaurants/${myRestaurant.id}`,
          {
            name: restaurantName.trim(),
            cuisine: cuisineLine.trim(),
            description: description.trim(),
            address: address.trim(),
            category: selectedVenueType,
            price_range: selectedPrice,
            status: isOpen ? 'open' : 'closed',
            opening_hours: formatTime(openHour, openMinute, openPeriod),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      Alert.alert('Success', 'Listing updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to save changes';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
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

          {/* Price Range */}
          <Text style={styles.label}>Price range</Text>
          <View style={styles.chipRow}>
            {priceRanges.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.priceChip, selectedPrice === p && styles.priceChipActive]}
                onPress={() => setSelectedPrice(p)}
              >
                <Text style={[styles.priceChipText, selectedPrice === p && styles.priceChipTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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

          {/* Open Until */}
          <Text style={styles.label}>Open until</Text>
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

      {/* ─── Save Button ─── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Save listing changes</Text>
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

  /* Price range chips */
  priceChip: {
    width: 64, height: 44, borderRadius: 24,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  priceChipActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  priceChipText: {
    fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: Colors.text,
  },
  priceChipTextActive: { color: Colors.white },

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

  /* Save bar */
  bottomBar: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: Colors.primary,
    borderRadius: 16, paddingVertical: 18,
  },
  saveBtnText: {
    fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.white,
  },
});
