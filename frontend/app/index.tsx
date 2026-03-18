import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import CustomButton from '@/components/CustomButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 1.19;

const SLIDES = [
  {
    id: '0',
    heading: 'Book Your Table\nInstantly',
    description: 'Find restaurants, check real-time\navailability, and lock in your spot instantly.',
  },
  {
    id: '1',
    heading: 'Discover Amazing\nRestaurants',
    description: 'Browse curated restaurants near you with\nreviews, menus, and photos.',
  },
  {
    id: '2',
    heading: 'Never Wait\nIn Line Again',
    description: 'Reserve your table in seconds and arrive to\na seat ready for you.',
  },
];

const AUTO_PLAY_INTERVAL = 6000;

export default function WelcomeScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToIndex = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  // Auto-play
  useEffect(() => {
    autoPlayTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % SLIDES.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_PLAY_INTERVAL);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [scrollToIndex]);

  // Reset timer on manual swipe
  const resetAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    autoPlayTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % SLIDES.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_PLAY_INTERVAL);
  }, [scrollToIndex]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (index !== activeIndex) {
        setActiveIndex(index);
        resetAutoPlay();
      }
    },
    [activeIndex, resetAutoPlay],
  );

  const renderSlide = useCallback(
    ({ item }: { item: (typeof SLIDES)[0] }) => (
      <View style={styles.slide}>
        <Text style={styles.heading}>{item.heading}</Text>
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      {/* Hero Image Section */}
      <View style={styles.heroContainer}>
        <Image
          source={require('@/assets/images/hero-restaurant.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'transparent', Colors.background]}
          locations={[0, 0.5, 1]}
          style={styles.heroGradient}
        />

        {/* Feature icons row */}
        <View style={styles.iconsRow}>
          <View style={[styles.iconCircle, styles.iconGold]}>
            <Ionicons name="restaurant-outline" size={24} color={Colors.cream} />
          </View>
          <View style={[styles.iconCircle, styles.iconRed]}>
            <Ionicons name="calendar-outline" size={24} color={Colors.cream} />
          </View>
          <View style={[styles.iconCircle, styles.iconGold]}>
            <Ionicons name="time-outline" size={24} color={Colors.cream} />
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        {/* Swipeable text carousel */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={styles.carousel}
        />

        {/* Pagination dots */}
        <View style={styles.dotsMargin}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <CustomButton
            title="Sign up"
            onPress={() => router.push('/signup')}
            variant="primary"
          />
          <CustomButton
            title="Log in"
            onPress={() => router.push('/login')}
            variant="outline"
          />
          <CustomButton
            title="Continue as Guest"
            onPress={() => router.replace('/(tabs)')}
            variant="text"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* ── Hero ── */
  heroContainer: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  iconsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGold: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  iconRed: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },

  /* ── Content ── */
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },

  /* ── Carousel ── */
  carousel: {
    flexGrow: 0,
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  heading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    lineHeight: 35,
    textAlign: 'center',
    color: Colors.text,
  },
  descriptionContainer: {
    alignItems: 'center',
    maxWidth: 280,
  },
  description: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    color: Colors.gray,
  },

  /* ── Dots ── */
  dotsMargin: {
    paddingVertical: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 9999,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.dotInactive,
  },

  /* ── Buttons ── */
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
});
