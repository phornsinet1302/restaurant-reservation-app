import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: {
    full_name?: string;
    avatar_url?: string | null;
  } | null;
};

type ReviewsSummary = {
  total: number;
  average: number;
};

function formatDate(dateString: string) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MerchantReviewsScreen() {
  const router = useRouter();
  const { toast } = useAppToast();
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewsSummary>({ total: 0, average: 0 });

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        toast('Please log in again.', 'warning');
        router.replace('/login' as any);
        return;
      }

      const restaurantRes = await axios.get(`${API_CONFIG.BASE_URL}/api/restaurants/merchant/my-restaurant`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const restaurant = restaurantRes.data?.data || restaurantRes.data;
      if (!restaurant?.id) {
        setRestaurantName('');
        setReviews([]);
        setSummary({ total: 0, average: 0 });
        return;
      }

      setRestaurantName(restaurant.name || '');

      const reviewsRes = await axios.get(`${API_CONFIG.BASE_URL}/api/reviews/${restaurant.id}`);
      const list = reviewsRes.data?.reviews || [];
      const s = reviewsRes.data?.summary || { total: list.length, average: 0 };

      setReviews(list);
      setSummary({ total: Number(s.total || 0), average: Number(s.average || 0) });
    } catch (error: any) {
      toast(error?.response?.data?.error || 'Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [loadReviews])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Reviews</Text>
          <Text style={styles.subtitle}>{restaurantName || 'Your restaurant'}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadReviews}>
          <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.muted}>Loading reviews...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.avgNumber}>{summary.total > 0 ? summary.average.toFixed(1) : '-'}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Ionicons
                  key={i}
                  name={i <= Math.round(summary.average) ? 'star' : 'star-outline'}
                  size={16}
                  color={i <= Math.round(summary.average) ? Colors.primary : Colors.border}
                />
              ))}
            </View>
            <Text style={styles.muted}>
              {summary.total} review{summary.total === 1 ? '' : 's'}
            </Text>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubbles-outline" size={42} color={Colors.gray} />
              <Text style={styles.emptyTitle}>No reviews yet</Text>
              <Text style={styles.emptySub}>When customers leave feedback, it will show here.</Text>
            </View>
          ) : (
            reviews.map((rv) => (
              <View key={rv.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.userWrap}>
                    {rv.user?.avatar_url ? (
                      <Image source={{ uri: rv.user.avatar_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Text style={styles.avatarInitial}>
                          {(rv.user?.full_name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.userName}>{rv.user?.full_name || 'Guest'}</Text>
                      <Text style={styles.reviewDate}>{formatDate(rv.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons
                        key={i}
                        name={i <= rv.rating ? 'star' : 'star-outline'}
                        size={15}
                        color={i <= rv.rating ? Colors.primary : Colors.border}
                      />
                    ))}
                  </View>
                </View>
                {!!rv.comment && <Text style={styles.comment}>{rv.comment}</Text>}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    marginTop: 58,
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 21, color: Colors.text },
  subtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { fontFamily: 'PlusJakartaSans-Regular', color: Colors.gray, fontSize: 13 },
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  avgNumber: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 34, color: Colors.text },
  starRow: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 26,
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.text, marginTop: 10 },
  emptySub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 6,
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4EFE0' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'PlusJakartaSans-Bold', color: Colors.primary, fontSize: 14 },
  userName: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.text },
  reviewDate: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray },
  comment: {
    marginTop: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray,
  },
});
