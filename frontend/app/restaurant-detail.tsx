import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ImageSourcePropType,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import RestaurantMap from '@/components/RestaurantMap'; // Disabled - requires native build
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAuth } from '@/hooks/useAuth';
import GuestLoginModal from '@/components/GuestLoginModal';

const API_URL = API_CONFIG.BASE_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 420;

/* ── Image maps ── */

const RESTAURANT_IMAGES: Record<string, ImageSourcePropType> = {
  'Pret A Manger': require('@/assets/restaurant-4.jpg'),
  'Romeo Lane': require('@/assets/restaurant-1.jpg'),
  'SkyLounge Bar': require('@/assets/restaurant-2.jpg'),
  'Sakura Sushi House': require('@/assets/restaurant-3.jpg'),
  'The Golden Hind': require('@/assets/restaurant-1.jpg'),
};

const FOOD_PHOTOS: ImageSourcePropType[] = [
  require('@/assets/restaurant-4.jpg'),
  require('@/assets/food/Nilagang Baboy.jpeg'),
  require('@/assets/food/food-3.jpeg'),
];

/* ── Static data ── */

const TIME_SLOTS = ['11:00am', '11:30am', '12:00pm', '12:30pm', '1:00pm'];

type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url?: string | null;
  description?: string;
  is_available?: boolean;
  restaurant_id: string;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Club Sandwich', category: 'Sandwich', price: 8, image: require('@/assets/food/food-1.jpeg') },
  { id: 'm2', name: 'Flat White', category: 'Coffee', price: 4, image: require('@/assets/food/Nilagang Baboy.jpeg') },
  { id: 'm3', name: 'Greek Salad', category: 'Salad', price: 7, image: require('@/assets/food/food-4.jpeg') },
  { id: 'm4', name: 'Margherita Pizza', category: 'Pizza', price: 12, image: require('@/assets/food/food-2.jpeg') },
];

type Review = {
  id: string;
  name: string;
  date: string;
  rating: number;
  text: string;
};

const REVIEWS: Review[] = [
  {
    id: 'rv1',
    name: 'Ava',
    date: 'Feb 22, 2026',
    rating: 4,
    text: 'Fast service and reliable coffee. Good option for a quick lunch break.',
  },
  {
    id: 'rv2',
    name: 'James',
    date: 'Feb 18, 2026',
    rating: 5,
    text: 'Great atmosphere and the food was incredible. Highly recommend the club sandwich.',
  },
];

/* ── Stars helper ── */

function StarRow({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={i <= rating ? Colors.primary : '#D4C9A8'}
        />
      ))}
    </View>
  );
}

/* ── Component ── */

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    rating: string;
    reviews: string;
    address: string;
    description: string;
    hours: string;
    distance: string;
  }>();

  const [isFav, setIsFav] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuPhotos, setMenuPhotos] = useState<any[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const { isGuest } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);
  // const [restaurantLocation, setRestaurantLocation] = useState(null); // Disabled
  // const [locationLoading, setLocationLoading] = useState(true); // Disabled

  const restaurantId = (params.id || '').trim();
  const name = params.name || 'Pret A Manger';
  const rating = params.rating || '4.0';
  const reviewsCount = params.reviews || '3.2k';
  const address = params.address || '42 Fleet Street, City';
  const description =
    params.description || 'Fresh, handmade food and organic coffee, served quickly and with a smile.';
  const hours = params.hours || 'Open Until 3:00pm';
  const distance = params.distance || '0.2 miles';

  // Use uploaded cover image if available, otherwise fall back to static map
  const heroImage = heroImageUrl 
    ? { uri: heroImageUrl }
    : RESTAURANT_IMAGES[name] || require('@/assets/restaurant-4.jpg');
  const closingTime = hours.replace('Open Until ', '');

  useEffect(() => {
    loadUserDataAndCheckFavorite();
    fetchMenuItems();
    fetchMenuPhotos();
    // fetchRestaurantLocation(); // Disabled - maps not available
  }, [restaurantId]);

  const loadUserDataAndCheckFavorite = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        const cleanToken = storedToken.trim();
        setToken(cleanToken);
        await checkIfFavorited(cleanToken, restaurantId);
      }
    } catch (error) {
      console.warn('Failed to load user data:', error);
    }
  };

  /* Disabled - RestaurantMap requires native build
  const fetchRestaurantLocation = async () => {
    try {
      setLocationLoading(true);
      const response = await axios.get(`${API_URL}/api/location/restaurant/${restaurantId}`);
      if (response.data.success) {
        setRestaurantLocation({
          ...response.data.location,
          name: name,
        });
      }
    } catch (error) {
      console.warn('Failed to fetch restaurant location:', error);
    } finally {
      setLocationLoading(false);
    }
  };
  */

  const checkIfFavorited = async (authToken: string, resId: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/favorites`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const isFavorited = response.data.some((fav: any) => fav.restaurant_id === resId);
      setIsFav(isFavorited);
    } catch (error) {
      console.warn('Failed to check favorite status:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      if (!restaurantId || restaurantId.length === 0) {
        console.warn('⚠️ [fetchMenuItems] No restaurantId available');
        return;
      }
      
      setMenuLoading(true);
      const url = `${API_URL}/api/restaurants/${restaurantId}`;
      console.log('🍽️ [fetchMenuItems] Fetching from:', url);
      
      const response = await axios.get(url);
      console.log('📊 [fetchMenuItems] Response:', response.data);
      
      // Extract and display cover image
      if (response.data?.image_url) {
        console.log('🖼️ [fetchMenuItems] Found cover image:', response.data.image_url);
        setHeroImageUrl(response.data.image_url);
      }

      if (response.data?.menu_items) {
        console.log(`✅ Found ${response.data.menu_items.length} menu items:`, response.data.menu_items);
        setMenuItems(response.data.menu_items);
      } else if (response.data?.data?.menu_items) {
        console.log(`✅ Found ${response.data.data.menu_items.length} menu items (nested)`, response.data.data.menu_items);
        setMenuItems(response.data.data.menu_items);
      } else {
        console.log('⚠️ No menu_items in response. Response keys:', Object.keys(response.data));
        console.log('Full response:', JSON.stringify(response.data, null, 2));
        setMenuItems([]);
      }
    } catch (error: any) {
      console.error('❌ [fetchMenuItems] Error:', error.message);
      console.error('   Response data:', error.response?.data);
      console.error('   Status:', error.response?.status);
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const fetchMenuPhotos = async () => {
    try {
      if (!restaurantId || restaurantId.length === 0) {
        console.warn('⚠️ [fetchMenuPhotos] No restaurantId available');
        return;
      }
      
      const url = `${API_URL}/api/menu-photos/${restaurantId}`;
      console.log('📸 [fetchMenuPhotos] Fetching from:', url);
      
      const response = await axios.get(url);
      console.log('📊 [fetchMenuPhotos] Response:', response.data);
      
      if (response.data?.data) {
        console.log(`✅ Found ${response.data.data.length} menu photos`);
        setMenuPhotos(response.data.data);
      } else if (Array.isArray(response.data)) {
        console.log(`✅ Found ${response.data.length} menu photos (array)`);
        setMenuPhotos(response.data);
      } else {
        console.log('⚠️ No menu photos found');
        setMenuPhotos([]);
      }
    } catch (error: any) {
      console.log('📸 [fetchMenuPhotos] No menu photos available:', error.message);
      setMenuPhotos([]);
    }
  };

  const handleToggleFavorite = async () => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in to favorite restaurants');
      return;
    }

    if (!restaurantId || restaurantId.length === 0) {
      Alert.alert('Error', 'Restaurant ID is missing');
      return;
    }

    setLoading(true);
    try {
      if (isFav) {
        // Remove from favorites
        await axios.delete(`${API_URL}/api/favorites/${restaurantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFav(false);
        Alert.alert('Removed', `${name} removed from favorites`);
      } else {
        // Add to favorites
        await axios.post(
          `${API_URL}/api/favorites/${restaurantId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFav(true);
        Alert.alert('Added', `${name} added to favorites`);
      }
    } catch (error: any) {
      console.error('Favorite toggle error:', error.response?.data || error.message);
      console.error('Restaurant ID being sent:', JSON.stringify(restaurantId));
      Alert.alert('Error', 'Failed to update favorite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = async () => {
    try {
      const query = encodeURIComponent(address || 'Location');
      
      const urls = Platform.select({
        ios: [
          `maps://maps.apple.com/?q=${query}`,
          `https://maps.apple.com/?q=${query}`,
        ],
        android: [
          `geo:0,0?q=${query}`,
          `https://www.google.com/maps/search/?api=1&query=${query}`,
        ],
        default: [
          `https://www.google.com/maps/search/?api=1&query=${query}`,
        ],
      }) || [];

      let opened = false;
      for (const url of urls) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            opened = true;
            break;
          }
        } catch (err) {
          console.warn(`Could not open URL: ${url}`);
          continue;
        }
      }

      if (!opened) {
        Alert.alert('Error', 'Unable to open maps. Please try again later.');
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert('Error', 'Could not open maps');
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Fixed Hero Image (stays behind scroll) ── */}
      <Image source={heroImage} style={styles.fixedHero} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={styles.scrollView}
      >
        {/* Transparent spacer so hero shows through */}
        <View style={styles.heroSpacer}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          {/* Favorite button */}
          <TouchableOpacity 
            style={styles.favBtn} 
            onPress={handleToggleFavorite}
            disabled={loading}
          >
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={24} color={isFav ? Colors.accent : Colors.white} />
          </TouchableOpacity>

          {/* Restaurant info overlay */}
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{name}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.openDot} />
              <Text style={styles.heroMetaText}>Open now</Text>
              <Text style={styles.heroMetaDivider}>•</Text>
              <Ionicons name="star" size={14} color={Colors.primary} />
              <Text style={styles.heroMetaText}>
                {rating} ({reviewsCount} Reviews)
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.moreInfoBtn}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.moreInfoText}>More info</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.directionsBtn} onPress={openGoogleMaps}>
                <Ionicons name="navigate-outline" size={18} color={Colors.text} />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Scrollable content with background ── */}
        <View style={styles.contentBody}>

        {/* ── Restaurant Story ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant story</Text>
          <Text style={styles.storyDesc}>{description}</Text>
          <View style={styles.storyMeta}>
            <Ionicons name="location-outline" size={16} color={Colors.gray} />
            <Text style={styles.storyMetaText}>{address}</Text>
            <Text style={styles.storyMetaDot}>•</Text>
            <Ionicons name="time-outline" size={16} color={Colors.gray} />
            <Text style={styles.storyMetaText}>Open until {closingTime}</Text>
          </View>
          <Text style={styles.openingHours}>Opening hours: Daily service until {closingTime}</Text>
        </View>

        {/* ── Photos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosRow}
          >
            {menuPhotos.length > 0 ? (
              menuPhotos.map((photo) => (
                <Image 
                  key={photo.id} 
                  source={{ uri: photo.photo_url }} 
                  style={styles.photoThumb} 
                />
              ))
            ) : (
              FOOD_PHOTOS.map((photo, i) => (
                <Image key={i} source={photo} style={styles.photoThumb} />
              ))
            )}
          </ScrollView>
        </View>

        {/* ── Map Location ── */}
        <View style={styles.mapCard}>
          <View style={styles.mapCardHeader}>
            <Text style={styles.mapCardTitle}>Map location</Text>
            <TouchableOpacity onPress={openGoogleMaps}>
              <Text style={styles.openMapsLink}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.mapImageWrapper} onPress={openGoogleMaps}>
            <Image
              source={require('@/assets/map/Screenshot 2026-03-08 at 12.04.44 in the afternoon.png')}
              style={styles.mapImage}
              resizeMode="cover"
            />
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>Tap map for directions</Text>
            </View>
          </TouchableOpacity>
          
          <Text style={styles.mapAddress}>{address}</Text>
          <Text style={styles.mapDirectionsNote}>
            Directions use your current location as the starting point.
          </Text>
        </View>

        {/* ── Ratings & Reviews ── */}
        <View style={styles.reviewsCard}>
          <View style={styles.reviewsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewsTitle}>Ratings & Reviews</Text>
              <Text style={styles.reviewsSub}>
                {rating} average from {reviewsCount} reviews
              </Text>
            </View>
            <View style={styles.ratingBigBox}>
              <Text style={styles.ratingBigNum}>{rating}</Text>
              <StarRow rating={Math.round(Number(rating))} size={14} />
            </View>
          </View>

          <TouchableOpacity style={styles.reviewCta}>
            <Text style={styles.reviewCtaText}>Complete a Visit to Review</Text>
          </TouchableOpacity>

          {REVIEWS.map((rv) => (
            <View key={rv.id} style={styles.reviewItem}>
              <View style={styles.reviewItemHeader}>
                <View>
                  <Text style={styles.reviewerName}>{rv.name}</Text>
                  <Text style={styles.reviewDate}>{rv.date}</Text>
                </View>
                <StarRow rating={rv.rating} size={16} />
              </View>
              <Text style={styles.reviewText}>{rv.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Available Slots ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available slots for today</Text>
          <View style={styles.slotsRow}>
            {TIME_SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[styles.slotChip, selectedSlot === slot && styles.slotChipActive]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextActive]}>
                  {slot}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Food Menu / Book Table buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.foodMenuBtn}>
            <Text style={styles.foodMenuText}>Food Menu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bookTableBtn}
            onPress={() => {
              if (isGuest) {
                setShowGuestModal(true);
              } else {
                router.push({
                  pathname: '/modify-booking',
                  params: {
                    restaurantId,
                    name,
                    address,
                  },
                } as any);
              }
            }}
          >
            <Text style={styles.bookTableText}>Book a Table</Text>
          </TouchableOpacity>
        </View>

        {/* ── Menu ── */}
        <View style={styles.menuCard}>
          <Text style={styles.menuCardTitle}>Menu</Text>
          {menuLoading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={{ marginTop: 8, fontFamily: 'PlusJakartaSans-Regular', color: Colors.gray }}>
                Loading menu...
              </Text>
            </View>
          ) : menuItems.length > 0 ? (
            menuItems.map((item) => (
              <View key={item.id} style={styles.menuItem}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
                ) : (
                  <View style={[styles.menuItemImage, { backgroundColor: '#F0EFDF', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={20} color={Colors.gray} />
                  </View>
                )}
                <View style={styles.menuItemInfo}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  <Text style={styles.menuItemCategory}>{item.category}</Text>
                </View>
                <Text style={styles.menuItemPrice}>${Number(item.price).toFixed(2)}</Text>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Ionicons name="restaurant-outline" size={24} color={Colors.gray} />
              <Text style={{ marginTop: 8, fontFamily: 'PlusJakartaSans-Regular', color: Colors.gray }}>
                No menu items yet
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <GuestLoginModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        feature="Booking"
      />
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Hero - fixed behind scroll */
  fixedHero: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  scrollView: {
    flex: 1,
  },
  heroSpacer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
  },
  contentBody: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingBottom: 0,
  },
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    color: Colors.white,
    marginBottom: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  openDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  heroMetaText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  heroMetaDivider: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  moreInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  moreInfoText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.white,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  directionsText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },

  /* Sections */
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },

  /* Restaurant story */
  storyDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray,
    marginBottom: 12,
  },
  storyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
  },
  storyMetaText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },
  storyMetaDot: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginHorizontal: 2,
  },
  openingHours: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },

  /* Photos */
  photosRow: {
    gap: 12,
    paddingTop: 4,
  },
  photoThumb: {
    width: 160,
    height: 120,
    borderRadius: 12,
  },

  /* Map card */
  mapCard: {
    marginHorizontal: 20,
    marginTop: 28,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapCardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  openMapsLink: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  mapImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 180,
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  mapOverlayText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.text,
  },
  mapAddress: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
    marginTop: 12,
  },
  mapDirectionsNote: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
  },
  mapLoadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },

  /* Ratings & Reviews card */
  reviewsCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewsTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  reviewsSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
  },
  ratingBigBox: {
    alignItems: 'center',
    backgroundColor: '#FDF6E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ratingBigNum: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 26,
    color: Colors.text,
    marginBottom: 2,
  },
  reviewCta: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewCtaText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    marginTop: 2,
  },
  reviewItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  reviewDate: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  reviewText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
  },

  /* Time slots */
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  slotChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  slotChipActive: {
    backgroundColor: '#FDF6E0',
    borderColor: Colors.primary,
  },
  slotText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  slotTextActive: {
    color: Colors.primary,
  },

  /* Action buttons */
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 28,
  },
  foodMenuBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  foodMenuText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
  },
  bookTableBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookTableText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.white,
  },

  /* Menu card */
  menuCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
  },
  menuCardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  menuItemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  menuItemName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  menuItemCategory: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  menuItemPrice: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.primary,
  },
});
