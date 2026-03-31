import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';

type TabKey = 'upcoming' | 'completed' | 'cancelled';

interface Reservation {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reservation_date: string;
  reservation_time: string;
  guest_count: number;
  table_id: string;
  table_number?: number;
  status: string;
  notes?: string;
  reference_code?: string;
  customer_name?: string;
  customer_email?: string;
  restaurant_name?: string;
}

export default function MerchantBookingsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReservations(res.data || []);

      // Also get restaurant name
      const dashRes = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dashRes.data?.restaurant_name) setRestaurantName(dashRes.data.restaurant_name);
    } catch {
      // empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const now = new Date();
  const upcoming = reservations.filter(r => {
    const resDate = new Date(`${r.reservation_date}T${r.reservation_time || '00:00'}`);
    return (r.status === 'pending' || r.status === 'confirmed') && resDate >= now;
  });
  const completed = reservations.filter(r => r.status === 'completed');
  const cancelled = reservations.filter(r => r.status === 'cancelled' || r.status === 'rejected');

  const tabData: Record<TabKey, { items: Reservation[]; count: number }> = {
    upcoming: { items: upcoming, count: upcoming.length },
    completed: { items: completed, count: completed.length },
    cancelled: { items: cancelled, count: cancelled.length },
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return date; // Already in YYYY-MM-DD format
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return { label: 'Completed', color: '#2BA15C', bg: '#E8F8EF' };
    if (status === 'cancelled' || status === 'rejected') return { label: 'Cancelled', color: '#E74C3C', bg: '#FDEDEC' };
    if (status === 'confirmed') return { label: 'Confirmed', color: '#2BA15C', bg: '#E8F8EF' };
    return { label: 'Pending', color: '#E88B00', bg: '#FFF3E0' };
  };

  const generateRef = (id: string) => {
    return 'RRA-' + id.slice(0, 5).toUpperCase();
  };

  const renderReservationCard = (item: Reservation) => {
    const badge = getStatusBadge(item.status);
    const ref = item.reference_code || generateRef(item.id);

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardRestaurant}>{restaurantName}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.cardRef}>Ref: {ref}</Text>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={Colors.gray} />
            <Text style={styles.detailText}>{formatDate(item.reservation_date)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={14} color={Colors.gray} />
            <Text style={styles.detailText}>{item.guest_count} guests</Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailText}>{formatTime(item.reservation_time)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailText}>Table {item.table_number || '—'}</Text>
          </View>
        </View>

        {item.customer_name || item.customer_email ? (
          <Text style={styles.bookedBy}>
            Booked by: {item.customer_name || ''} {item.customer_email ? `(${item.customer_email})` : ''}
          </Text>
        ) : null}

        {item.notes ? (
          <Text style={styles.note}>Note: {item.notes}</Text>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentItems = tabData[activeTab].items;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reservations</Text>
        <Text style={styles.subtitle}>Manage your reservations</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['upcoming', 'completed', 'cancelled'] as TabKey[]).map(tab => {
          const isActive = activeTab === tab;
          const count = tabData[tab].count;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {currentItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>No {activeTab} reservations</Text>
            <Text style={styles.emptySubtitle}>Your {activeTab} reservations will appear here</Text>
          </View>
        ) : (
          currentItems.map(renderReservationCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.text },
  subtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 16,
    backgroundColor: Colors.white, borderRadius: 28, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.text },
  tabText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, color: Colors.gray },
  tabTextActive: { fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.white },

  scrollContent: { paddingBottom: 30 },

  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },

  card: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardRestaurant: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 12 },
  cardRef: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray },

  cardDetails: {
    flexDirection: 'row', gap: 24, marginBottom: 4,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray },

  bookedBy: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.text, marginTop: 10,
  },
  note: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.primary,
    fontStyle: 'italic', marginTop: 4,
  },
});
