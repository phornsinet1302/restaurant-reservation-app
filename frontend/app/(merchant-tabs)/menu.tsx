import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  is_time_based?: boolean;
  restaurant_id: string;
}

export default function MerchantMenuScreen() {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Get merchant dashboard to find restaurant
      const dashRes = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dashRes.data?.restaurant_name) setRestaurantName(dashRes.data.restaurant_name);

      // Get restaurant ID from user's restaurants
      const restRes = await axios.get(`${API_CONFIG.BASE_URL}/api/restaurants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const myRestaurant = restRes.data?.find?.((r: any) => r.merchant_id === user?.id);
      if (myRestaurant) {
        setRestaurantId(myRestaurant.id);
        setRestaurantName(myRestaurant.name);

        // Get menu items for this restaurant
        const menuRes = await axios.get(
          `${API_CONFIG.BASE_URL}/api/menu?restaurant_id=${myRestaurant.id}`
        );
        setMenuItems(menuRes.data || []);
      }
    } catch {
      // Use empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleDelete = (item: MenuItem) => {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.delete(`${API_CONFIG.BASE_URL}/api/menu/${item.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setMenuItems(prev => prev.filter(m => m.id !== item.id));
          } catch {
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCount = menuItems.filter(i => i.is_available !== false).length;
  const soldOutCount = menuItems.filter(i => i.is_available === false).length;
  const timeBasedCount = menuItems.filter(i => i.is_time_based).length;

  const getStatusBadge = (item: MenuItem) => {
    if (item.is_time_based) return { label: 'Time Based', color: '#B8960C', bg: '#FFF8DC' };
    if (item.is_available === false) return { label: 'Sold Out', color: '#E74C3C', bg: '#FDEDEC' };
    return { label: 'Available', color: '#2BA15C', bg: '#E8F8EF' };
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Menu</Text>
            <Text style={styles.subtitle}>Manage what customers see on your public{'\n'}restaurant page</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-menu-item' as any)}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Sync Card */}
        <View style={styles.syncCard}>
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>PUBLIC MENU SYNC</Text>
          </View>
          <Text style={styles.syncRestaurantName}>{restaurantName}</Text>
          <Text style={styles.syncDesc}>Menu changes here update the customer{'\n'}restaurant detail page.</Text>
          <View style={styles.syncStats}>
            <View style={styles.syncStatItem}>
              <Text style={styles.syncStatValue}>{availableCount}</Text>
              <Text style={styles.syncStatLabel}>Available</Text>
            </View>
            <View style={styles.syncStatItem}>
              <Text style={styles.syncStatValue}>{soldOutCount}</Text>
              <Text style={styles.syncStatLabel}>Sold out</Text>
            </View>
            <View style={styles.syncStatItem}>
              <Text style={styles.syncStatValue}>{timeBasedCount}</Text>
              <Text style={styles.syncStatLabel}>Time based</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            placeholderTextColor={Colors.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Menu Items */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No menu items yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Item" to create your first dish</Text>
          </View>
        ) : (
          filteredItems.map(item => {
            const badge = getStatusBadge(item);
            return (
              <View key={item.id} style={styles.menuCard}>
                <View style={styles.menuCardContent}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.menuImage} />
                  ) : (
                    <View style={[styles.menuImage, styles.menuImagePlaceholder]}>
                      <Ionicons name="image-outline" size={24} color={Colors.gray} />
                    </View>
                  )}
                  <View style={styles.menuInfo}>
                    <View style={styles.menuNameRow}>
                      <Text style={styles.menuName}>{item.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.menuCategory}>{item.category}</Text>
                    {item.description ? (
                      <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <View style={styles.menuBottomRow}>
                      <Text style={styles.menuPrice}>${item.price?.toFixed(2)}</Text>
                      <View style={styles.menuActions}>
                        <TouchableOpacity style={styles.actionBtn}>
                          <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                          <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.text },
  subtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24,
  },
  addButtonText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.white },

  syncCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#FDF8E8', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  syncBadge: {
    backgroundColor: 'rgba(231,189,39,0.15)', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginBottom: 12,
  },
  syncBadgeText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 11, color: Colors.text, letterSpacing: 0.5 },
  syncRestaurantName: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.text, marginBottom: 4 },
  syncDesc: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginBottom: 16 },
  syncStats: { flexDirection: 'row', gap: 10 },
  syncStatItem: {
    backgroundColor: Colors.white, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: Colors.border, minWidth: 80,
  },
  syncStatValue: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.text },
  syncStatLabel: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, marginLeft: 10, fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: Colors.text,
  },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.text, marginTop: 12 },
  emptySubtext: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },

  menuCard: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  menuCardContent: { flexDirection: 'row', gap: 14 },
  menuImage: { width: 70, height: 70, borderRadius: 35 },
  menuImagePlaceholder: {
    backgroundColor: '#F0EFDF', alignItems: 'center', justifyContent: 'center',
  },
  menuInfo: { flex: 1 },
  menuNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuName: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.text, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 12 },
  menuCategory: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 2 },
  menuDesc: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },
  menuBottomRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,
  },
  menuPrice: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.primary },
  menuActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5F0E0', alignItems: 'center', justifyContent: 'center',
  },
});
