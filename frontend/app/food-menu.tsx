import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { Colors } from '@/constants/Colors';

const API_URL = API_CONFIG.BASE_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PAD = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PAD * 2 - CARD_GAP) / 2;

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string | null;
  is_available?: boolean;
  restaurant_id: string;
};

const ALL_LABEL = 'All';

export default function FoodMenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ restaurantId: string; restaurantName: string }>();

  const restaurantId = params.restaurantId || '';
  const restaurantName = params.restaurantName || 'Menu';

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/api/menu`, {
        params: { restaurant_id: restaurantId },
      });
      const data: MenuItem[] = response.data?.data || response.data || [];
      setItems(data.filter((item) => item.is_available !== false));
    } catch {
      setError('Failed to load menu. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    ALL_LABEL,
    ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
  ];

  const filtered =
    activeCategory === ALL_LABEL
      ? items
      : items.filter((i) => i.category === activeCategory);

  // Pair items into rows of 2 for the grid
  const rows: MenuItem[][] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2));
  }

  return (
    <View style={styles.root}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading…' : `${items.length} item${items.length !== 1 ? 's' : ''} available`}
          </Text>
        </View>
      </View>

      {/* ── Category filter pills ── */}
      {!loading && !error && items.length > 0 && (
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading menu…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="wifi-outline" size={32} color={Colors.gray} />
          </View>
          <Text style={styles.emptyTitle}>Couldn't load menu</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchMenu} activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="restaurant-outline" size={32} color={Colors.gray} />
          </View>
          <Text style={styles.emptyTitle}>No items yet</Text>
          <Text style={styles.emptyText}>The restaurant hasn't added any menu items yet.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 32 }]}
        >
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((item) => (
                <View key={item.id} style={styles.card}>
                  {/* Image */}
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.cardImg} />
                  ) : (
                    <View style={styles.cardImgPlaceholder}>
                      <Ionicons name="fast-food-outline" size={36} color="#D8D0C0" />
                    </View>
                  )}

                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}
                    <Text style={styles.itemPrice}>${Number(item.price).toFixed(2)}</Text>
                  </View>
                </View>
              ))}
              {/* Fill empty slot if odd number of items */}
              {row.length === 1 && <View style={styles.cardEmpty} />}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F4EE',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F2EDE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 1,
  },

  /* Category tabs */
  tabsWrapper: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    height: 52,
  },
  tabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    height: 52,
  },
  tab: {
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F2EDE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.gray,
  },
  tabTextActive: {
    color: '#fff',
  },

  /* Grid */
  grid: {
    paddingTop: 16,
    paddingHorizontal: HORIZONTAL_PAD,
    gap: CARD_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },

  /* Card */
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2F2518',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  cardEmpty: {
    width: CARD_WIDTH,
  },
  cardImg: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    resizeMode: 'cover',
    backgroundColor: '#EDE8DD',
  },
  cardImgPlaceholder: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    backgroundColor: '#EDE8DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 10,
    gap: 3,
  },
  itemName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 19,
    textAlign: 'center',
  },
  itemDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: Colors.gray,
    textAlign: 'center',
  },
  itemPrice: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 2,
  },

  /* States */
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE8DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  retryText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
});
