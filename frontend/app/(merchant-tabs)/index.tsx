import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useNotifications } from '@/hooks/useNotifications';

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type WeekDay = {
  date: string;
  total: number;
  pending: number;
  confirmed: number;
  arrived: number;
  completed: number;
};

// Get today's day index (0=Mon ... 6=Sun)
function getTodayIndex() {
  const d = new Date().getDay(); // 0=Sun ... 6=Sat
  return d === 0 ? 6 : d - 1;
}

export default function MerchantDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [availableDishes, setAvailableDishes] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [confirmedBookings, setConfirmedBookings] = useState(0);
  const [arrivedBookings, setArrivedBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [weeklyOverview, setWeeklyOverview] = useState<WeekDay[]>([]);
  const [activeDay, setActiveDay] = useState(getTodayIndex());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
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
        setAvailableDishes(res.data.available_dishes ?? res.data.total_menu_items ?? 0);
        setPendingBookings(res.data.pending_bookings || 0);
        setConfirmedBookings(res.data.confirmed_bookings || 0);
        setArrivedBookings(res.data.arrived_bookings || 0);
        setCompletedBookings(res.data.completed_bookings || 0);

        if (res.data.weekly && res.data.weekly.length === 7) {
          setWeeklyOverview(res.data.weekly);
        }
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message;
      
      // Handle case where merchant has no restaurant yet
      if (errorMsg && errorMsg.includes('No restaurant found')) {
        console.warn('⚠️ [MerchantDashboard] Merchant has no restaurant account yet');
        setRestaurantName('No Restaurant Setup');
        setRestaurantAddress('Please create or select a restaurant');
        return;
      }
      
      console.error('❌ [MerchantDashboard] Error:', errorMsg);
    } finally {
      setRefreshing(false);
    }
  };

  // When user taps a day in weekly overview, update the stat cards
  const handleDayPress = (dayIndex: number) => {
    setActiveDay(dayIndex);
    const dayData = weeklyOverview[dayIndex];
    if (dayData) {
      setPendingBookings(dayData.pending);
      setConfirmedBookings(dayData.confirmed);
      setArrivedBookings(dayData.arrived);
      setCompletedBookings(dayData.completed);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setActiveDay(getTodayIndex());
    loadDashboardData();
  };

  const weeklyTotals = weeklyOverview.map(d => d?.total ?? 0);
  const maxVal = Math.max(...weeklyTotals, 1);

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header with gradient */}
        <LinearGradient
          colors={[Colors.primary, '#D4A821', '#C49B1D']}
          style={[styles.headerGradient, { paddingTop: Math.max(insets.top + 12, 60) }]}
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
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.restaurantName}>{restaurantName}</Text>
          {restaurantAddress ? (
            <Text style={styles.restaurantAddress}>{restaurantAddress}</Text>
          ) : null}
        </LinearGradient>

        {/* Stat cards */}
        <View style={styles.statsGrid}>
          {/* Available Dishes */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(merchant-tabs)/menu' as any)}
          >
            <View style={[styles.statIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="restaurant-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{availableDishes}</Text>
            <Text style={styles.statLabel}>Available Dishes</Text>
          </TouchableOpacity>

          {/* Pending Bookings */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(merchant-tabs)/bookings' as any)}
          >
            <View style={[styles.statIcon, { backgroundColor: '#F0EFDF' }]}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{pendingBookings}</Text>
            <Text style={styles.statLabel}>Pending Bookings</Text>
          </TouchableOpacity>

          {/* Confirmed Bookings */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(merchant-tabs)/bookings' as any)}
          >
            <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{confirmedBookings}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </TouchableOpacity>

          {/* Arrived Bookings */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(merchant-tabs)/bookings' as any)}
          >
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="person-add-outline" size={16} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{arrivedBookings}</Text>
            <Text style={styles.statLabel}>Arrived</Text>
          </TouchableOpacity>

          {/* Completed Bookings */}
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(merchant-tabs)/bookings' as any)}
          >
            <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="flag-outline" size={16} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{completedBookings}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Overview */}
        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyTitle}>Weekly Overview</Text>
            <Text style={styles.weeklySubtitle}>
              {weeklyOverview[activeDay]?.date
                ? new Date(weeklyOverview[activeDay].date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : ''}
              {' · '}{weeklyTotals[activeDay] || 0} booking{weeklyTotals[activeDay] !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.chartContainer}>
            {DAYS.map((day, i) => {
              const barHeight = weeklyTotals.length > 0
                ? Math.max((weeklyTotals[i] / maxVal) * 100, 4)
                : 4;
              const isActive = i === activeDay;
              const isToday = i === getTodayIndex();
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.chartColumn}
                  onPress={() => handleDayPress(i)}
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
                  {isToday && <View style={styles.todayDot} />}
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
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF2424',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 10,
    color: '#fff',
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
  weeklySubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
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
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    marginTop: 4,
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
