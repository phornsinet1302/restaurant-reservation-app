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
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION = 15_000; // 15 seconds per story

/* ── Types ── */

export type StorySlide = {
  image: ImageSourcePropType;
  video?: string; // Optional video URL
  title: string;
  description: string;
};

export type StoryGroup = {
  id: string;
  restaurantId?: string;
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
  onStoryDeleted?: () => void; // Callback when story is deleted
}

interface BackgroundMediaProps {
  slide: StorySlide | undefined;
  videoError: boolean;
  onVideoError: (error: any) => void;
}

function VideoPlayerWrapper({ videoUrl, onError }: { videoUrl: string; onError: (error: any) => void }) {
  // Only proceed if we have a valid URL
  if (!videoUrl || videoUrl.length === 0) {
    return <View style={styles.bgImage} />;
  }

  // Format source properly for expo-video with uri object
  const source = { uri: videoUrl };
  const videoPlayer = useVideoPlayer(source);

  useEffect(() => {
    if (videoPlayer && typeof videoPlayer.play === 'function') {
      try {
        videoPlayer.loop = true;
        // Wrap play() result in Promise.resolve to safely handle both promise and non-promise returns
        Promise.resolve(videoPlayer.play()).catch((err: any) => {
          console.warn('Video play error:', err);
          onError(err);
        });
      } catch (err) {
        console.warn('Video config error:', err);
      }
    }
  }, [videoPlayer, onError]);

  return (
    <VideoView
      player={videoPlayer}
      style={styles.bgImage}
      nativeControls={false}
      onError={(error) => {
        console.warn('🎥 Video playback error:', error);
        onError(error);
      }}
    />
  );
}

function BackgroundMedia({ slide, videoError, onVideoError }: BackgroundMediaProps) {
  // Check if we have a valid video URL (simple check)
  const hasValidVideo = slide?.video && 
                        slide.video.length > 0 && 
                        !slide.video.startsWith('file://');

  // Show video if available and no error
  if (hasValidVideo && !videoError) {
    return (
      <VideoPlayerWrapper
        videoUrl={slide!.video}
        onError={onVideoError}
      />
    );
  }

  // Fall back to image
  return <Image source={slide?.image} style={styles.bgImage} resizeMode="cover" />;
}

/* ── Component ── */

export default function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
  onStoryDeleted,
}: StoryViewerProps) {
  const router = useRouter();
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [slideIdx, setSlideIdx] = useState(0);
  const [videoError, setVideoError] = useState<boolean>(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const prevGroupCountRef = useRef(groups.length);
  const prevSlideCountRef = useRef(groups[initialGroupIndex]?.slides.length || 0);

  // Validate indices
  const validGroupIdx = Math.min(groupIdx, Math.max(0, groups.length - 1));
  const group = groups[validGroupIdx];
  const validSlideIdx = group && group.slides ? Math.min(slideIdx, Math.max(0, group.slides.length - 1)) : 0;
  const slide = group?.slides?.[validSlideIdx];
  const totalSlides = group?.slides?.length || 0;

  // Detect if current group/story was deleted
  useEffect(() => {
    // Check if total groups changed
    if (groups.length < prevGroupCountRef.current) {
      console.warn('⚠️ Stories were deleted! Recalculating indices...');
      const newGroupIdx = Math.min(groupIdx, Math.max(0, groups.length - 1));
      if (newGroupIdx !== groupIdx) {
        console.log(`   Moving from group ${groupIdx} to ${newGroupIdx}`);
        setGroupIdx(newGroupIdx);
        setSlideIdx(0);
      }
      prevGroupCountRef.current = groups.length;
      onStoryDeleted?.();
    }

    // Check if current group's slides changed
    const currentGroup = groups[groupIdx];
    if (currentGroup && currentGroup.slides.length < prevSlideCountRef.current) {
      console.warn(`⚠️ Story was deleted from current group! (${prevSlideCountRef.current} → ${currentGroup.slides.length})`);
      const newSlideIdx = Math.min(slideIdx, Math.max(0, currentGroup.slides.length - 1));
      if (newSlideIdx !== slideIdx) {
        console.log(`   Moving from slide ${slideIdx} to ${newSlideIdx}`);
        setSlideIdx(newSlideIdx);
      }
      prevSlideCountRef.current = currentGroup.slides.length;
    }
  }, [groups, groupIdx, slideIdx, onStoryDeleted]);

  // Safety check: if no groups or current group has no slides, close
  if (!groups || groups.length === 0 || !group || !group.slides || group.slides.length === 0) {
    console.warn('⚠️ No valid stories to display - closing story viewer');
    onClose();
    return null;
  }

  /* Start / restart the timer bar */
  const startTimer = useCallback(() => {
    // Validate slide before starting timer
    if (!slide) {
      console.warn('⚠️ Invalid slide, skipping timer');
      return;
    }
    
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
  }, [validSlideIdx, groupIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startTimer();
    setVideoError(false); // Reset video error when slide changes
    return () => animRef.current?.stop();
  }, [startTimer]);

  /* Navigation */
  const goNext = useCallback(() => {
    // Check if current group still has slides
    if (!group || !group.slides || group.slides.length === 0) {
      console.warn('⚠️ Current group has no slides - closing');
      onClose();
      return;
    }

    if (slideIdx < totalSlides - 1) {
      setSlideIdx((prev) => prev + 1);
    } else if (groupIdx < groups.length - 1) {
      const nextGroupIdx = groupIdx + 1;
      if (groups[nextGroupIdx] && groups[nextGroupIdx].slides && groups[nextGroupIdx].slides.length > 0) {
        setGroupIdx(nextGroupIdx);
        setSlideIdx(0);
      } else {
        console.warn('⚠️ Next group has no slides - skipping');
        onClose();
      }
    } else {
      console.log('✅ Finished all stories');
      onClose();
    }
  }, [slideIdx, totalSlides, groupIdx, groups.length, onClose, group]);

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((prev) => prev - 1);
    } else if (groupIdx > 0) {
      const prevGroupIdx = groupIdx - 1;
      if (groups[prevGroupIdx] && groups[prevGroupIdx].slides && groups[prevGroupIdx].slides.length > 0) {
        setGroupIdx(prevGroupIdx);
        setSlideIdx(groups[prevGroupIdx].slides.length - 1);
      }
    }
  }, [slideIdx, groupIdx, groups]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background - Image or Video */}
      <BackgroundMedia
        slide={slide}
        videoError={videoError}
        onVideoError={(error) => {
          setVideoError(true);
        }}
      />

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

        <TouchableOpacity
          style={styles.bookButton}
          activeOpacity={0.8}
          onPress={() => {
            const restaurantId = group.restaurantId;
            if (restaurantId) {
              onClose();
              router.push(`/restaurant-detail?id=${restaurantId}`);
            }
          }}
        >
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
