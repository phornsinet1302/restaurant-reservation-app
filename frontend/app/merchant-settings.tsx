import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SETTINGS_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string | null }[] = [
  { icon: 'person-outline', label: 'Edit Profile', route: '/edit-profile' },
  { icon: 'storefront-outline', label: 'Restaurant Listing', route: '/restaurant-listing' },
  { icon: 'images-outline', label: 'Stories', route: '/manage-stories' },
  { icon: 'location-outline', label: 'Business Addresses', route: '/business-addresses' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications' },
  { icon: 'globe-outline', label: 'Language', route: '/language' },
  { icon: 'shield-outline', label: 'Privacy & Security', route: '/privacy-security' },
  { icon: 'help-circle-outline', label: 'Help & Support', route: '/help-support' },
  { icon: 'information-circle-outline', label: 'About', route: '/about' },
];

export default function MerchantSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Customize your experience</Text>
          </View>
        </View>

        {/* Menu List */}
        <View style={styles.card}>
          {SETTINGS_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.row,
                idx === SETTINGS_ITEMS.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => item.route && router.push(item.route as any)}
              activeOpacity={item.route ? 0.6 : 1}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={20} color={Colors.primary} />
                </View>
                <Text style={styles.rowLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version Footer */}
        <Text style={styles.version}>FoodReserve v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: { marginTop: 2 },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: Colors.text,
  },

  version: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 28,
  },
});
