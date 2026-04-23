import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

export default function MerchantProfileScreen() {
  const { toast, confirm } = useAppToast();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user) {
        setUserName(user.fullName || user.name || '');
        setUserEmail(user.email || '');
        if (user.profile_picture_url) {
          setProfileImageUri(user.profile_picture_url);
        }
      }

      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        const dashRes = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (dashRes.data?.restaurant_name) setRestaurantName(dashRes.data.restaurant_name);
      }
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  };

  const handleEditListing = () => {
    router.push('/restaurant-listing' as any);
  };

  const handleLogout = () => {
    confirm('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await AsyncStorage.multiRemove(['token', 'user', 'guestMode']);
          router.replace('/login' as any);
        },
      },
    ]);
  };

  const getInitial = () => {
    return userName ? userName.charAt(0).toUpperCase() : 'R';
  };

  const handlePickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast('Please allow access to your photo library.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const token = await AsyncStorage.getItem('token');

        const formData = new FormData();
        formData.append('file', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: `profile_${Date.now()}.jpg`,
        } as any);

        const uploadRes = await axios.post(
          `${API_CONFIG.BASE_URL}/api/auth/upload-profile-picture`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
          }
        );

        const newUrl = uploadRes.data.profile_picture_url;
        setProfileImageUri(newUrl);

        // Update AsyncStorage
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        user.profile_picture_url = newUrl;
        await AsyncStorage.setItem('user', JSON.stringify(user));

        toast('Profile picture updated!', 'success');
      }
    } catch (error: any) {
      toast(error.response?.data?.error || 'Failed to upload.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const menuItems = [
    { icon: 'notifications-outline' as const, label: 'Notifications', route: '../notifications' },
    { icon: 'star-outline' as const, label: 'Reviews', route: '/merchant-reviews' },
    { icon: 'shield-outline' as const, label: 'Privacy & Security', route: '../privacy-security' },
    { icon: 'help-circle-outline' as const, label: 'Help & Support', route: '../merchant-help-support' },
    { icon: 'settings-outline' as const, label: 'Settings', route: '../merchant-settings' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={{ width: '100%', height: '100%', borderRadius: 40 }} />
              ) : (
                <Text style={styles.avatarText}>{getInitial()}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.cameraBtn} onPress={handlePickAndUploadImage} disabled={uploadingImage}>
              <Ionicons name={uploadingImage ? "hourglass" : "camera-outline"} size={14} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName || 'Restaurant Owner'}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
            {restaurantName ? (
              <View style={styles.restaurantBadge}>
                <Ionicons name="storefront-outline" size={14} color={Colors.primary} />
                <Text style={styles.restaurantBadgeText}>{restaurantName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickCard} onPress={handleEditListing}>
            <View style={styles.quickIcon}>
              <Ionicons name="pencil-outline" size={24} color={Colors.text} />
            </View>
            <Text style={styles.quickLabel}>Edit listing</Text>
            <Text style={styles.quickSub}>Manage restaurant info</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/manage-stories' as any)}>
            <View style={styles.quickIcon}>
              <Ionicons name="images-outline" size={24} color={Colors.text} />
            </View>
            <Text style={styles.quickLabel}>Manage stories</Text>
            <Text style={styles.quickSub}>Add or remove stories</Text>
          </TouchableOpacity>
        </View>

        {/* Menu List */}
        <View style={styles.menuList}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.menuItem}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconCircle}>
                  <Ionicons name={item.icon} size={20} color={Colors.text} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 30 },

  profileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginTop: 70, marginHorizontal: 20, marginBottom: 24,
    backgroundColor: '#F5F0E0', borderRadius: 20, padding: 20,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.primary },
  cameraBtn: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, color: Colors.text },
  profileEmail: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 2 },
  restaurantBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginTop: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  restaurantBadgeText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, color: Colors.text },

  quickActions: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 14, marginBottom: 24,
  },
  quickCard: {
    flex: 1, backgroundColor: '#F5F0E0', borderRadius: 16, padding: 20,
    alignItems: 'center',
  },
  quickIcon: { marginBottom: 10 },
  quickLabel: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.text, textAlign: 'center' },
  quickSub: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray, textAlign: 'center', marginTop: 2 },

  menuList: {
    marginHorizontal: 20, backgroundColor: Colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5F0E0', alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 15, color: Colors.text },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 24, marginHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  logoutText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15, color: '#E74C3C' },
});
