import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import RestaurantMap from '@/components/RestaurantMap'; // Disabled - requires native build
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAuth } from '@/hooks/useAuth';
import GuestLoginModal from '@/components/GuestLoginModal';
import { useAppToast } from '@/components/ToastProvider';

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

type ReviewUser = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type Review = {
  id: string;
  restaurant_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user: ReviewUser | null;
};

type ReviewSummary = {
  total: number;
  average: number;
  distribution: Record<string, number>;
};

function formatReviewDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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
  const { toast } = useAppToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    rating: string;
    reviews: string;
    address: string;
    description: string;
    hours: string;
    distance: string;
    latitude: string;
    longitude: string;
    /** When "1", open reviews section + write-review flow (e.g. from booking history) */
    openReview?: string;
  }>();

  const [isFav, setIsFav] = useState(false);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuPhotos, setMenuPhotos] = useState<any[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [allPhotos, setAllPhotos] = useState<ImageSourcePropType[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const photoListRef = useRef<FlatList>(null);
  const reviewsSectionRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [reviewsSectionY, setReviewsSectionY] = useState(0);
  const openedReviewFromDeepLink = useRef(false);
  const myReviewRef = useRef<Review | null>(null);
  const { isGuest } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<ReviewSummary>({
    total: 0,
    average: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [draftRating, setDraftRating] = useState<number>(0);
  const [draftComment, setDraftComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  // const [restaurantLocation, setRestaurantLocation] = useState(null); // Disabled
  // const [locationLoading, setLocationLoading] = useState(true); // Disabled

  useEffect(() => {
    myReviewRef.current = myReview;
  }, [myReview]);

  const restaurantId = (params.id || '').trim();
  const [name, setName] = useState(params.name || '');
  const [rating, setRating] = useState(params.rating || '4.0');
  const [reviewsCount, setReviewsCount] = useState(params.reviews || '0');
  const [address, setAddress] = useState(params.address || '');
  const [latitude, setLatitude] = useState<number | null>(params.latitude ? parseFloat(params.latitude) : null);
  const [longitude, setLongitude] = useState<number | null>(params.longitude ? parseFloat(params.longitude) : null);
  const [description, setDescription] = useState(params.description || '');
  const [hours, setHours] = useState(params.hours || '');
  const [distance] = useState(params.distance || '0.2 miles');

  // Use uploaded cover image if available, otherwise fall back to static map
  const heroImage = heroImageUrl
    ? { uri: heroImageUrl }
    : RESTAURANT_IMAGES[name] || require('@/assets/restaurant-4.jpg');
  const closingTime = (hours || 'Open Until 3:00pm').replace('Open Until ', '');

  // Build combined photos list for the viewer
  const buildAllPhotos = (): ImageSourcePropType[] => {
    const photos: ImageSourcePropType[] = [];
    if (menuPhotos.length > 0) {
      menuPhotos.forEach((p) => photos.push({ uri: p.photo_url }));
    } else {
      FOOD_PHOTOS.forEach((p) => photos.push(p));
    }
    menuItems.forEach((item) => {
      if (item.image_url) photos.push({ uri: item.image_url });
    });
    return photos;
  };

  const openPhotoViewer = (photo: ImageSourcePropType) => {
    const photos = buildAllPhotos();
    const idx = photos.findIndex((p) => {
      const pUri = (p as any)?.uri;
      const targetUri = (photo as any)?.uri;
      if (pUri && targetUri) return pUri === targetUri;
      return p === photo;
    });
    setAllPhotos(photos);
    setPhotoIndex(idx >= 0 ? idx : 0);
    setShowPhotoViewer(true);
  };

  useEffect(() => {
    openedReviewFromDeepLink.current = false;
  }, [restaurantId, params.openReview]);

  useEffect(() => {
    loadUserDataAndCheckFavorite();
    fetchMenuItems();
    fetchMenuPhotos();
    fetchReviews();
    // fetchRestaurantLocation(); // Disabled - maps not available
  }, [restaurantId]);

  useEffect(() => {
    const raw = params.openReview;
    const wantOpen =
      raw === '1' ||
      raw === 'true' ||
      (Array.isArray(raw) && (raw[0] === '1' || raw[0] === 'true'));
    if (!restaurantId || !wantOpen || openedReviewFromDeepLink.current || reviewsLoading) {
      return;
    }

    const t = setTimeout(async () => {
      if (isGuest) {
        openedReviewFromDeepLink.current = true;
        setShowGuestModal(true);
        return;
      }
      const authTok = token || (await AsyncStorage.getItem('token')) || '';
      if (!authTok) {
        toast('Please log in to write a review', 'warning');
        return;
      }

      openedReviewFromDeepLink.current = true;
      requestAnimationFrame(() => {
        scrollToReviews();
        const mr = myReviewRef.current;
        setDraftRating(mr?.rating || 0);
        setDraftComment(mr?.comment || '');
        setShowReviewModal(true);
      });
    }, 500);

    return () => clearTimeout(t);
  }, [restaurantId, params.openReview, reviewsLoading, isGuest, token, toast]);

  const fetchReviews = async () => {
    if (!restaurantId) return;
    try {
      setReviewsLoading(true);
      const response = await axios.get(`${API_URL}/api/reviews/${restaurantId}`);
      const list: Review[] = response.data?.reviews || [];
      const summary: ReviewSummary = response.data?.summary || {
        total: list.length,
        average: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
      setReviews(list);
      setReviewsSummary(summary);
      setReviewsCount(String(summary.total));
      if (summary.total > 0) {
        setRating(summary.average.toFixed(1));
      }

      // If the user is signed in, find their own review in the list (it's in the same response)
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken && !isGuest) {
        const storedUserRaw = await AsyncStorage.getItem('user');
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;
        const uid = storedUser?.id;
        const mine = uid ? list.find((r) => r.user_id === uid) : null;
        setMyReview(mine || null);
      } else {
        setMyReview(null);
      }
    } catch (err: any) {
      console.warn('⚠️ Failed to fetch reviews:', err?.message);
    } finally {
      setReviewsLoading(false);
    }
  };

  const scrollToReviews = () => {
    if (reviewsSectionY > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: reviewsSectionY - 20, animated: true });
    }
  };

  const openReviewModal = () => {
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }
    if (!token) {
      toast('Please log in to write a review', 'warning');
      return;
    }
    setDraftRating(myReview?.rating || 0);
    setDraftComment(myReview?.comment || '');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (draftRating < 1 || draftRating > 5) {
      toast('Please pick a star rating', 'error');
      return;
    }
    try {
      setSubmittingReview(true);
      const authToken = token || (await AsyncStorage.getItem('token')) || '';
      if (!authToken) {
        setShowReviewModal(false);
        setShowGuestModal(true);
        return;
      }
      await axios.post(
        `${API_URL}/api/reviews/${restaurantId}`,
        { rating: draftRating, comment: draftComment.trim() },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );
      setShowReviewModal(false);
      toast(myReview ? 'Review updated' : 'Thanks for your feedback!', 'success');
      await fetchReviews();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Could not submit review';
      toast(msg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const deleteMyReview = async () => {
    if (!myReview) return;
    Alert.alert('Delete review?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const authToken = token || (await AsyncStorage.getItem('token')) || '';
            await axios.delete(`${API_URL}/api/reviews/review/${myReview.id}`, {
              headers: { Authorization: `Bearer ${authToken}` },
            });
            setShowReviewModal(false);
            toast('Review deleted', 'success');
            await fetchReviews();
          } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || 'Could not delete';
            toast(msg, 'error');
          }
        },
      },
    ]);
  };

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

      // Populate restaurant info from API (fills in missing URL params, e.g. when navigating from stories)
      if (response.data) {
        const r = response.data;
        if (r.name) setName(r.name);
        if (r.address) setAddress(r.address);
        if (r.description) setDescription(r.description);
        if (r.rating != null) setRating(String(r.rating));
        if (r.closing_hours) setHours(`Open Until ${r.closing_hours}`);
        if (r.latitude != null) setLatitude(parseFloat(r.latitude));
        if (r.longitude != null) setLongitude(parseFloat(r.longitude));
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
    if (isGuest) {
      setShowGuestModal(true);
      return;
    }

    if (!token) {
      toast('You must be logged in to favorite restaurants', 'error');
      return;
    }

    if (!restaurantId || restaurantId.length === 0) {
      toast('Restaurant ID is missing', 'error');
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
        toast(`${name} removed from favorites`, 'success');
      } else {
        // Add to favorites
        await axios.post(
          `${API_URL}/api/favorites/${restaurantId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFav(true);
        toast(`${name} added to favorites`, 'success');
      }
    } catch (error: any) {
      console.error('Favorite toggle error:', error.response?.data || error.message);
      console.error('Restaurant ID being sent:', JSON.stringify(restaurantId));
      toast('Failed to update favorite. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = async () => {
    try {
      const destination =
        latitude && longitude
          ? `${latitude},${longitude}`
          : encodeURIComponent(address || 'Location');

      const useCoords = !!(latitude && longitude);

      // Always prefer Google Maps; fall back to web Google Maps
      const urls = Platform.select({
        ios: [
          // Google Maps app (deep link)
          useCoords
            ? `comgooglemaps://?daddr=${destination}&directionsmode=driving`
            : `comgooglemaps://?q=${destination}`,
          // Web fallback (opens in browser → may redirect to GM app)
          useCoords
            ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
            : `https://www.google.com/maps/search/?api=1&query=${destination}`,
        ],
        android: [
          useCoords
            ? `google.navigation:q=${destination}`
            : `geo:0,0?q=${destination}`,
          useCoords
            ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
            : `https://www.google.com/maps/search/?api=1&query=${destination}`,
        ],
        default: [
          useCoords
            ? `https://www.google.com/maps/dir/?api=1&destination=${destination}`
            : `https://www.google.com/maps/search/?api=1&query=${destination}`,
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
        toast('Unable to open Google Maps. Please make sure Google Maps is installed.', 'error');
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      toast('Could not open maps', 'error');
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Fixed Hero Image (stays behind scroll) ── */}
      <Image source={heroImage} style={styles.fixedHero} />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={styles.scrollView}
      >
        {/* Transparent spacer so hero shows through */}
        <View style={styles.heroSpacer}>
          {/* Back button */}
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 8 }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>

          {/* Favorite button */}
          <TouchableOpacity 
            style={[styles.favBtn, { top: insets.top + 8 }]} 
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
              <TouchableOpacity
                onPress={scrollToReviews}
                style={{ flexDirection: 'row', alignItems: 'center' }}
                activeOpacity={0.7}
              >
                <Ionicons name="star" size={14} color={Colors.primary} />
                <Text style={[styles.heroMetaText, { textDecorationLine: 'underline' }]}>
                  {rating} ({reviewsCount} Review{reviewsCount === '1' ? '' : 's'})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View style={styles.heroActions}>
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
                <TouchableOpacity key={photo.id} activeOpacity={0.8} onPress={() => openPhotoViewer({ uri: photo.photo_url })}>
                  <Image 
                    source={{ uri: photo.photo_url }} 
                    style={styles.photoThumb} 
                  />
                </TouchableOpacity>
              ))
            ) : (
              FOOD_PHOTOS.map((photo, i) => (
                <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => openPhotoViewer(photo)}>
                  <Image source={photo} style={styles.photoThumb} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* ── Full-screen Photo Viewer (swipe + zoom) ── */}
        <Modal visible={showPhotoViewer} transparent animationType="fade" onRequestClose={() => setShowPhotoViewer(false)}>
          <View style={styles.photoModalOverlay}>
            <TouchableOpacity style={styles.photoModalClose} onPress={() => setShowPhotoViewer(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <FlatList
              ref={photoListRef}
              data={allPhotos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={photoIndex}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setPhotoIndex(idx);
              }}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <ScrollView
                  style={{ width: SCREEN_WIDTH }}
                  contentContainerStyle={styles.photoZoomContainer}
                  maximumZoomScale={4}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  bouncesZoom
                >
                  <Image source={item} style={styles.photoModalImage} resizeMode="contain" />
                </ScrollView>
              )}
            />
            {allPhotos.length > 1 && (
              <Text style={styles.photoCounter}>{photoIndex + 1} / {allPhotos.length}</Text>
            )}
          </View>
        </Modal>

        {/* ── Map Location ── */}
        <View style={styles.mapCard}>
          <View style={styles.mapCardHeader}>
            <Text style={styles.mapCardTitle}>Map location</Text>
            <TouchableOpacity onPress={openGoogleMaps}>
              <Text style={styles.openMapsLink}>Open in Google Maps</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.mapCtaCard} onPress={openGoogleMaps} activeOpacity={0.8}>
            <View style={styles.mapCtaIconWrap}>
              <Ionicons name="navigate-circle-outline" size={30} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapCtaTitle}>Get live directions</Text>
              <Text style={styles.mapCtaSub}>Opens Google Maps with this restaurant location</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>

          <Text style={styles.mapAddress}>{address}</Text>
          <Text style={styles.mapDirectionsNote}>
            Directions use your current location as the starting point.
          </Text>
        </View>

        {/* ── Ratings & Reviews ── */}
        <View
          ref={reviewsSectionRef}
          style={styles.reviewsCard}
          onLayout={(e) => setReviewsSectionY(e.nativeEvent.layout.y + HERO_HEIGHT)}
        >
          <View style={styles.reviewsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewsTitle}>Ratings & Reviews</Text>
              <Text style={styles.reviewsSub}>
                {reviewsSummary.total > 0
                  ? `${reviewsSummary.average.toFixed(1)} average from ${reviewsSummary.total} review${reviewsSummary.total === 1 ? '' : 's'}`
                  : 'No reviews yet — be the first!'}
              </Text>
            </View>
            <View style={styles.ratingBigBox}>
              <Text style={styles.ratingBigNum}>
                {reviewsSummary.total > 0 ? reviewsSummary.average.toFixed(1) : '–'}
              </Text>
              <StarRow
                rating={reviewsSummary.total > 0 ? Math.round(reviewsSummary.average) : 0}
                size={14}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.reviewCta} onPress={openReviewModal} activeOpacity={0.85}>
            <Ionicons
              name={myReview ? 'create-outline' : 'star-outline'}
              size={18}
              color={Colors.white}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.reviewCtaText}>
              {myReview ? 'Edit your review' : 'Write a review'}
            </Text>
          </TouchableOpacity>

          {reviewsLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : reviews.length === 0 ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={22} color={Colors.gray} />
              <Text style={{ marginTop: 8, fontFamily: 'PlusJakartaSans-Regular', color: Colors.gray, fontSize: 13 }}>
                No reviews yet.
              </Text>
            </View>
          ) : (
            reviews.map((rv) => (
              <View key={rv.id} style={styles.reviewItem}>
                <View style={styles.reviewItemHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {rv.user?.avatar_url ? (
                      <Image source={{ uri: rv.user.avatar_url }} style={styles.reviewAvatar} />
                    ) : (
                      <View style={[styles.reviewAvatar, styles.reviewAvatarFallback]}>
                        <Text style={styles.reviewAvatarLetter}>
                          {(rv.user?.full_name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.reviewerName} numberOfLines={1}>
                        {rv.user?.full_name || 'Guest'}
                        {myReview && rv.id === myReview.id ? '  (you)' : ''}
                      </Text>
                      <Text style={styles.reviewDate}>{formatReviewDate(rv.created_at)}</Text>
                    </View>
                  </View>
                  <StarRow rating={rv.rating} size={16} />
                </View>
                {!!rv.comment && <Text style={styles.reviewText}>{rv.comment}</Text>}
              </View>
            ))
          )}
        </View>

        {/* ── Available Slots ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available slots for today</Text>
          <View style={styles.slotsRow}>
            {TIME_SLOTS.map((slot) => (
              <View key={slot} style={styles.slotChip}>
                <Text style={styles.slotText}>{slot}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Food Menu / Book Table buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.foodMenuBtn} onPress={() => toast('Food menu coming soon', 'info')}>
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
                  <TouchableOpacity activeOpacity={0.8} onPress={() => openPhotoViewer({ uri: item.image_url! })}>
                    <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
                  </TouchableOpacity>
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

      {/* ── Write a Review modal ── */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.reviewModalBackdrop}
        >
          <View style={styles.reviewModalCard}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>
                {myReview ? 'Edit your review' : 'Write a review'}
              </Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.reviewModalRestaurantName} numberOfLines={1}>
              {name}
            </Text>

            <Text style={styles.reviewModalLabel}>Your rating</Text>
            <View style={styles.starPickerRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setDraftRating(i)}
                  activeOpacity={0.7}
                  style={styles.starPickerBtn}
                >
                  <Ionicons
                    name={i <= draftRating ? 'star' : 'star-outline'}
                    size={36}
                    color={i <= draftRating ? Colors.primary : '#D4C9A8'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.reviewModalLabel}>Feedback (optional)</Text>
            <TextInput
              value={draftComment}
              onChangeText={setDraftComment}
              placeholder="Share your experience so others can decide"
              placeholderTextColor={Colors.gray}
              multiline
              maxLength={2000}
              style={styles.reviewTextInput}
              textAlignVertical="top"
            />
            <Text style={styles.reviewCharCount}>{draftComment.length}/2000</Text>

            <View style={styles.reviewModalActions}>
              {myReview ? (
                <TouchableOpacity
                  onPress={deleteMyReview}
                  style={[styles.reviewSecondaryBtn, { borderColor: '#D9534F' }]}
                  disabled={submittingReview}
                >
                  <Text style={[styles.reviewSecondaryText, { color: '#D9534F' }]}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowReviewModal(false)}
                  style={styles.reviewSecondaryBtn}
                  disabled={submittingReview}
                >
                  <Text style={styles.reviewSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={submitReview}
                style={[styles.reviewPrimaryBtn, submittingReview && { opacity: 0.7 }]}
                disabled={submittingReview || draftRating < 1}
              >
                {submittingReview ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.reviewPrimaryText}>
                    {myReview ? 'Save changes' : 'Submit review'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  photoZoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    color: '#fff',
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
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
  mapCtaCard: {
    borderRadius: 12,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFDF6',
  },
  mapCtaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5EFDC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtaTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  mapCtaSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  reviewCtaText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EFDF',
  },
  reviewAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarLetter: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: Colors.primary,
  },
  reviewModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reviewModalCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewModalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  reviewModalRestaurantName: {
    marginTop: 4,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  reviewModalLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  starPickerBtn: {
    padding: 4,
  },
  reviewTextInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    backgroundColor: '#FEFCF4',
  },
  reviewCharCount: {
    marginTop: 6,
    textAlign: 'right',
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
  },
  reviewModalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  reviewSecondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSecondaryText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  reviewPrimaryBtn: {
    flex: 1.3,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewPrimaryText: {
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
    backgroundColor: '#C99700',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookTableText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
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
