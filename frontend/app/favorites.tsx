import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

/* ── Data ── */

type FavoriteRestaurant = {
  id: string;
  name: string;
  tags: string;
  rating: string;
  distance: string;
  image: ImageSourcePropType;
};

const FAVORITES: FavoriteRestaurant[] = [
  {
    id: 'f1',
    name: 'Romeo Lane',
    tags: 'Crafted Cocktails \u2022 Gourmet Cuisine \u2022 Best Bar',
    rating: '4.5',
    distance: '0.3 miles',
    image: require('@/assets/restaurant-1.jpg'),
  },
  {
    id: 'f2',
    name: 'Sakura Sushi Bar',
    tags: 'Japanese \u2022 Sushi \u2022 Omakase',
    rating: '4.8',
    distance: '0.5 miles',
    image: require('@/assets/restaurant-3.jpg'),
  },
  {
    id: 'f3',
    name: 'Pret A Manger',
    tags: 'Coffee \u2022 Sandwiches \u2022 Fresh Food',
    rating: '4.0',
    distance: '0.2 miles',
    image: require('@/assets/restaurant-4.jpg'),
  },
];

/* ── Component ── */

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState(FAVORITES);

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Favorite Restaurants</Text>
          <Text style={styles.headerSub}>{favorites.length} saved</Text>
        </View>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {favorites.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() =>
              router.push({
                pathname: '/restaurant-detail',
                params: {
                  name: item.name,
                  rating: item.rating,
                  reviews: '3.2k',
                  address: '42 Fleet Street, City',
                  description:
                    'Fresh, handmade food and organic coffee, served quickly and with a smile.',
                  hours: 'Open Until 11:00pm',
                  distance: item.distance,
                },
              } as any)
            }
          >
            {/* Image */}
            <View style={styles.cardImageWrapper}>
              <Image source={item.image} style={styles.cardImage} />
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => removeFavorite(item.id)}
              >
                <Ionicons name="heart" size={20} color={Colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardTags}>{item.tags}</Text>
              <View style={styles.cardMeta}>
                <Ionicons name="star" size={14} color={Colors.primary} />
                <Text style={styles.cardRating}>{item.rating}</Text>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={Colors.gray}
                  style={{ marginLeft: 12 }}
                />
                <Text style={styles.cardDistance}>{item.distance}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {favorites.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No favorites yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },

  /* Card */
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  cardImageWrapper: {
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: 14,
  },
  cardName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    color: Colors.text,
    marginBottom: 4,
  },
  cardTags: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardRating: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  cardDistance: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },

  /* Empty */
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
    color: Colors.gray,
  },
});
