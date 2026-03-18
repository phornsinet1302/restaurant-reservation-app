import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import StoryViewer, { StoryGroup } from '@/components/StoryViewer';

/* ── Full story data for each restaurant ── */

const STORY_GROUPS: StoryGroup[] = [
  {
    id: 's1',
    name: 'Romeo Lane',
    time: '8h ago',
    distance: '0.3 miles',
    avatar: require('@/assets/food/food-1.jpeg'),
    slides: [
      {
        image: require('@/assets/food/food-1.jpeg'),
        title: 'Counter seats just reopened',
        description:
          'We have just opened up our chef counter — 8 seats with a front-row view of the kitchen. Perfect for date night or solo dining.',
      },
      {
        image: require('@/assets/food/Nilagang Baboy.jpeg'),
        title: 'New winter tasting menu',
        description:
          'Our new 7-course seasonal menu has launched featuring locally sourced ingredients from farms across the countryside.',
      },
    ],
  },
  {
    id: 's2',
    name: 'Sakura Sushi House',
    time: '8h ago',
    distance: '1.2 miles',
    avatar: require('@/assets/food/food-2.jpeg'),
    slides: [
      {
        image: require('@/assets/food/food-2.jpeg'),
        title: 'Omakase night every Friday',
        description:
          'Join us every Friday for a 12-piece omakase experience. Limited to 20 guests per evening — book early to secure your spot.',
      },
      {
        image: require('@/assets/food/How to Cook Classic Filipino Sinigang – Step-by-Step Guide.jpeg'),
        title: 'Happy hour sushi rolls',
        description:
          'Half-price on all signature rolls from 5 PM to 7 PM, Monday through Thursday. Pair with our new sake selection.',
      },
    ],
  },
  {
    id: 's3',
    name: 'SkyLounge Bar',
    time: '10h ago',
    distance: '0.8 miles',
    avatar: require('@/assets/food/food-3.jpeg'),
    slides: [
      {
        image: require('@/assets/food/food-3.jpeg'),
        title: 'Rooftop terrace now open',
        description:
          'Our stunning rooftop terrace is officially open for the season. Enjoy craft cocktails with panoramic city views every evening.',
      },
    ],
  },
  {
    id: 's4',
    name: 'Pret A Manger',
    time: '13h ago',
    distance: '0.1 miles',
    avatar: require('@/assets/food/food-4.jpeg'),
    slides: [
      {
        image: require('@/assets/food/food-4.jpeg'),
        title: 'New breakfast wraps available',
        description:
          'Start your morning right with our new range of freshly made breakfast wraps. Available from 7 AM every day.',
      },
    ],
  },
];

export default function StoryScreen() {
  const { groupIndex } = useLocalSearchParams<{ groupIndex: string }>();
  const router = useRouter();

  const idx = parseInt(groupIndex ?? '0', 10);

  return (
    <StoryViewer
      groups={STORY_GROUPS}
      initialGroupIndex={idx}
      onClose={() => router.back()}
    />
  );
}
