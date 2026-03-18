import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  ImageSourcePropType,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION = 15_000; // 15 seconds per story

/* ── Types ── */

export type StorySlide = {
  image: ImageSourcePropType;
  title: string;
  description: string;
};

export type StoryGroup = {
  id: string;
  name: string;
  time: string;
  distance: string;
  avatar: ImageSourcePropType;
  slides: StorySlide[];
};

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
}

/* ── Component ── */

export default function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const group = groups[groupIdx];
  const slide = group.slides[slideIdx];
  const totalSlides = group.slides.length;

  /* Start / restart the timer bar */
  const startTimer = useCallback(() => {
    progress.setValue(0);
    animRef.current?.stop();
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) goNext();
    });
  }, [groupIdx, slideIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startTimer();
    return () => animRef.current?.stop();
  }, [startTimer]);

  /* Navigation */
  const goNext = useCallback(() => {
    if (slideIdx < totalSlides - 1) {
      setSlideIdx((prev) => prev + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((prev) => prev + 1);
      setSlideIdx(0);
    } else {
      onClose();
    }
  }, [slideIdx, totalSlides, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((prev) => prev - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((prev) => prev - 1);
      setSlideIdx(groups[groupIdx - 1].slides.length - 1);
    }
  }, [slideIdx, groupIdx, groups]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background image */}
      <Image source={slide.image} style={styles.bgImage} resizeMode="cover" />

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* ── Top section ── */}
      <View style={styles.topBar}>
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {group.slides.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  i < slideIdx
                    ? { flex: 1 }
                    : i === slideIdx
                    ? {
                        width: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      }
                    : { width: 0 },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image source={group.avatar} style={styles.headerAvatar} />
            <View>
              <Text style={styles.headerName}>{group.name}</Text>
              <Text style={styles.headerTime}>{group.time}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tap zones ── */}
      <View style={styles.tapZones}>
        <TouchableWithoutFeedback onPress={goPrev}>
          <View style={styles.tapLeft}>
            <View style={styles.arrowCircle}>
              <Ionicons name="chevron-back" size={20} color="#FFF" />
            </View>
          </View>
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={goNext}>
          <View style={styles.tapRight}>
            <View style={styles.arrowCircle}>
              <Ionicons name="chevron-forward" size={20} color="#FFF" />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>

      {/* ── Bottom card ── */}
      <View style={styles.bottomCard}>
        <View style={styles.bottomTopRow}>
          <Text style={styles.storyCount}>
            Story {slideIdx + 1} of {totalSlides}
          </Text>
          <View style={styles.distanceRow}>
            <Ionicons name="location" size={14} color={Colors.gray} />
            <Text style={styles.distanceText}>{group.distance}</Text>
          </View>
        </View>

        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideDesc}>{slide.description}</Text>

        <TouchableOpacity style={styles.bookButton} activeOpacity={0.8}>
          <Text style={styles.bookButtonText}>Book Table</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },

  /* Top */
  topBar: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: '#FFF',
  },
  headerTime: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  /* Tap zones */
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 5,
  },
  tapLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  tapRight: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Bottom */
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30, 24, 14, 0.88)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 44,
    zIndex: 10,
  },
  bottomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyCount: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  slideTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    lineHeight: 30,
    color: '#FFF',
    marginBottom: 8,
  },
  slideDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  bookButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
