import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

/* ── Data ── */

type SearchRestaurant = {
  id: string;
  name: string;
  address: string;
  description: string;
  hours: string;
  distance: string;
  rating: string;
  image: ImageSourcePropType;
};

const FILTERS = [
  { id: 'all', emoji: '🔍', label: 'All' },
  { id: 'restaurants', emoji: '🍽️', label: 'Restaurants' },
  { id: 'pubs', emoji: '🍺', label: 'Pubs' },
  { id: 'cafe', emoji: '☕', label: 'Café' },
];

const NEARBY: SearchRestaurant[] = [
  {
    id: 'n1',
    name: 'Pret A Manger',
    address: '42 Fleet Street, City',
    description: 'Fresh, handmade food and organic coffee,\nserved quickly and with a smile.',
    hours: 'Open Until 3:00pm',
    distance: '0.2 miles',
    rating: '4.0',
    image: require('@/assets/restaurant-4.jpg'),
  },
  {
    id: 'n2',
    name: 'Romeo Lane',
    address: '7 Bell Yard, Holborn',
    description: 'Experience the finest seasonal dining with\nan elegant and intimate atmosphere.',
    hours: 'Open Until 11:00pm',
    distance: '0.3 miles',
    rating: '4.5',
    image: require('@/assets/restaurant-1.jpg'),
  },
  {
    id: 'n3',
    name: 'SkyLounge Bar',
    address: '14 Bishopsgate, EC2N',
    description: 'Rooftop cocktails with panoramic city\nviews and a vibrant atmosphere.',
    hours: 'Open Until 1:00am',
    distance: '0.8 miles',
    rating: '4.8',
    image: require('@/assets/restaurant-2.jpg'),
  },
  {
    id: 'n4',
    name: 'Sakura Sushi House',
    address: '23 Kingsway, Covent Garden',
    description: 'Authentic Japanese cuisine crafted by\nmaster sushi chefs since 2005.',
    hours: 'Open Until 10:30pm',
    distance: '1.2 miles',
    rating: '4.7',
    image: require('@/assets/restaurant-3.jpg'),
  },
  {
    id: 'n5',
    name: 'The Golden Hind',
    address: '73 Marylebone Lane, W1U',
    description: 'Traditional British fish and chips in a\ncharming setting since 1914.',
    hours: 'Open Until 10:00pm',
    distance: '1.5 miles',
    rating: '4.4',
    image: require('@/assets/restaurant-1.jpg'),
  },
];

/* ── Component ── */

export default function SearchScreen() {
  const [activeFilter, setActiveFilter] = useState('all');
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search nearby restaurants</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search restaurants..."
          placeholderTextColor={Colors.gray}
        />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterPill,
              activeFilter === f.id && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text
              style={[
                styles.filterLabel,
                activeFilter === f.id && styles.filterLabelActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Count */}
      <Text style={styles.countText}>
        Nearby restaurants around you ({NEARBY.length})
      </Text>

      {/* Cards */}
      {NEARBY.map((r) => (
        <TouchableOpacity
          key={r.id}
          style={styles.card}
          activeOpacity={0.9}
          onPress={() =>
            router.push({
              pathname: '/restaurant-detail',
              params: {
                name: r.name,
                rating: r.rating,
                reviews: '3.2k',
                address: r.address,
                description: r.description.replace('\n', ' '),
                hours: r.hours,
                distance: r.distance,
              },
            } as any)
          }
        >
          {/* Image */}
          <View style={styles.cardImageWrapper}>
            <Image source={r.image} style={styles.cardImage} />
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#FFFBF0" />
              <Text style={styles.ratingText}>{r.rating}</Text>
            </View>
          </View>

          {/* Name row */}
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{r.name}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity>
                <Ionicons name="heart-outline" size={22} color={Colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.detailsBtn}>
                <Text style={styles.detailsBtnText}>Details</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Address */}
          <Text style={styles.cardAddress}>{r.address}</Text>

          {/* Description */}
          <Text style={styles.cardDesc}>{r.description}</Text>

          {/* Meta */}
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={Colors.gray} />
              <Text style={styles.metaText}>{r.hours}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.gray} />
              <Text style={styles.metaText}>{r.distance}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 30,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },

  /* Search */
  searchBox: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F5EFDC',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    color: Colors.text,
    fontSize: 14,
  },

  /* Filters */
  filtersRow: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterPillActive: {
    backgroundColor: '#FDF6E0',
    borderColor: Colors.primary,
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  filterLabelActive: {
    color: Colors.primary,
  },

  /* Count */
  countText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  /* Card */
  card: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  cardImageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(47, 37, 24, 0.70)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ratingText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: '#FFFBF0',
  },

  /* Card info */
  cardNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cardName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  detailsBtnText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  cardAddress: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  cardDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
    marginTop: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },
});
