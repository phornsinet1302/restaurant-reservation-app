import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MerchantDashboard() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [revenue, setRevenue] = useState('0.00');
  const [availableDishes, setAvailableDishes] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [rating, setRating] = useState('4.7');
  const [weeklyData, setWeeklyData] = useState([30, 15, 20, 18, 22, 25, 20]);
  const [activeDay, setActiveDay] = useState(0); // Monday = 0

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data) {
        setRestaurantName(res.data.restaurant_name || 'My Restaurant');
        setRestaurantAddress(res.data.address || '');
        setRevenue(res.data.today_revenue?.toFixed(2) || '59.00');
        setAvailableDishes(res.data.total_menu_items || 4);
        setPendingBookings(res.data.pending_bookings || 0);
        setRating(res.data.rating?.toString() || '4.7');
      }
    } catch {
      // Use defaults on error
    }
  };

  const maxVal = Math.max(...weeklyData, 1);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header with gradient */}
        <LinearGradient
          colors={[Colors.primary, '#D4A821', '#C49B1D']}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>RESTAURANT DASHBOARD</Text>
            </View>
            <TouchableOpacity
              style={styles.bellCircle}
              onPress={() => router.push('../notifications' as any)}
            >
              <Ionicons name="notifications-outline" size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.restaurantName}>{restaurantName}</Text>
          {restaurantAddress ? (
            <Text style={styles.restaurantAddress}>{restaurantAddress}</Text>
          ) : null}
        </LinearGradient>

        {/* Stat cards */}
        <View style={styles.statsGrid}>
          {/* Revenue */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0EFDF' }]}>
              <Text style={{ fontSize: 16 }}>$</Text>
            </View>
            <Text style={styles.statValue}>${revenue}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
          </View>

          {/* Available Dishes */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="restaurant-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{availableDishes}</Text>
            <Text style={styles.statLabel}>Available Dishes</Text>
          </View>

          {/* Pending Bookings */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{pendingBookings}</Text>
            <Text style={styles.statLabel}>Pending Bookings</Text>
          </View>

          {/* Rating */}
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="star-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Weekly Overview */}
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyTitle}>Weekly Overview</Text>
            <Ionicons name="trending-up" size={22} color="#2BA15C" />
          </View>
          <View style={styles.chartContainer}>
            {DAYS.map((day, i) => {
              const barHeight = (weeklyData[i] / maxVal) * 100;
              const isActive = i === activeDay;
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.chartColumn}
                  onPress={() => setActiveDay(i)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: isActive ? Colors.primary : '#F0EFDF',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(merchant-tabs)/menu' as any)}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Manage{'\n'}Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(merchant-tabs)/bookings' as any)}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Reservation</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/restaurant-listing' as any)}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Public Listing</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/merchant-settings' as any)}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="settings-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 30,
  },

  /* Header gradient */
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  bellCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 26,
    color: Colors.text,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: 'rgba(47, 37, 24, 0.7)',
  },

  /* Stat cards grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: CARD_GAP,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
  },

  /* Weekly overview */
  weeklyCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weeklyTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 100,
    justifyContent: 'flex-end',
    width: 28,
  },
  bar: {
    width: 28,
    borderRadius: 6,
    minHeight: 8,
  },
  dayLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 8,
  },
  dayLabelActive: {
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans-Bold',
  },

  /* Quick Actions */
  quickActionsTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: CARD_GAP,
  },
  actionCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
    flexShrink: 1,
  },
});
