import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAuth } from '@/hooks/useAuth';
import GuestLoginModal from '@/components/GuestLoginModal';

/* ── Data ── */

const MENU_ITEMS = [
  { icon: 'heart-outline' as const, label: 'Favorite Restaurants', route: '../favorites' },
  { icon: 'notifications-outline' as const, label: 'Notifications', route: '../notifications' },
  { icon: 'shield-checkmark-outline' as const, label: 'Privacy & Security', route: '../privacy-security' },
  { icon: 'help-circle-outline' as const, label: 'Help & Support', route: '../help-support' },
];

/* ── Component ── */

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isGuest } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Check if user is guest when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isGuest) {
        setShowGuestModal(true);
      }
    }, [isGuest])
  );

  // Load user profile data on mount
  useEffect(() => {
    loadUserProfile();
    loadProfileImage();
  }, []);

  // Load user profile data from AsyncStorage
  const loadUserProfile = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      console.log('📱 Raw AsyncStorage user data:', userData);
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('📋 Parsed user data:', parsedUser);
        console.log('📧 Email:', parsedUser.email);
        console.log('👤 Full Name:', parsedUser.fullName || parsedUser.name);
        console.log('📞 Phone:', parsedUser.phone);
        console.log('🎂 DOB:', parsedUser.dateOfBirth || parsedUser.date_of_birth);
        console.log('📝 Bio:', parsedUser.bio);
        
        // Handle both camelCase and snake_case from backend
        setFullName(parsedUser.fullName || parsedUser.name || '');
        setEmail(parsedUser.email || '');
        setPhone(parsedUser.phone || '');
        setDateOfBirth(parsedUser.dateOfBirth || parsedUser.date_of_birth || '');
        setBio(parsedUser.bio || '');
      } else {
        console.log('⚠️ No user data found in AsyncStorage');
      }
    } catch (error) {
      console.log('❌ Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved profile image from AsyncStorage
  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImageUri(savedImage);
      }
    } catch (error) {
      console.log('Error loading profile image:', error);
    }
  };

  // Pick image from camera or gallery
  const handlePickImage = async () => {
    Alert.alert(
      'Upload Profile Picture',
      'Choose a source',
      [
        {
          text: 'Camera',
          onPress: () => pickImageFromCamera(),
        },
        {
          text: 'Gallery',
          onPress: () => pickImageFromGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImageFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is required to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access camera.');
      console.error(error);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery access is required to select a photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access gallery.');
      console.error(error);
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);

      // For now, save the image URI locally
      // In production, you would upload to a server
      await AsyncStorage.setItem('profileImage', imageUri);
      setProfileImageUri(imageUri);

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile picture.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Validate and format date (DD/MM/YYYY -> YYYY-MM-DD)
  const formatDateForSave = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Remove spaces and normalize
    const cleaned = dateStr.trim();
    
    // Try DD/MM/YYYY format
    const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = cleaned.match(ddmmyyyyRegex);
    
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      
      // Validate ranges
      if (month < 1 || month > 12) {
        console.warn('❌ Invalid month:', month);
        return null;
      }
      if (day < 1 || day > 31) {
        console.warn('❌ Invalid day:', day);
        return null;
      }
      if (year < 1900 || year > new Date().getFullYear()) {
        console.warn('❌ Invalid year:', year);
        return null;
      }
      
      // Return YYYY-MM-DD format
      const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      console.log('✅ Date formatted:', dateStr, '->', formatted);
      return formatted;
    }
    
    // Try YYYY-MM-DD format (already correct)
    const yyyymmddRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const match2 = cleaned.match(yyyymmddRegex);
    if (match2) {
      return cleaned;
    }
    
    console.warn('❌ Invalid date format:', dateStr);
    return null;
  };

  const handleSaveProfile = async () => {
    try {
      console.log('\n=== SAVE PROFILE START ===');
      
      // Validate date format before saving
      let formattedDate: string | null = null;
      if (dateOfBirth) {
        formattedDate = formatDateForSave(dateOfBirth);
        if (!formattedDate) {
          Alert.alert('Invalid Date', 'Please enter date in DD/MM/YYYY format (e.g., 15/03/1990)');
          console.log('=== SAVE PROFILE END (DATE VALIDATION FAILED) ===\n');
          return;
        }
      }
      
      // Get token for API call
      const token = await AsyncStorage.getItem('token');
      console.log('🔐 Token retrieved:', token ? `${token.slice(0, 30)}...` : 'NO TOKEN');
      
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      // Call backend API to update profile
      console.log('📤 Sending profile update to backend...');
      console.log('API Endpoint:', API_CONFIG.ENDPOINTS.AUTH.UPDATE_PROFILE);
      console.log('Payload:', { fullName, phone, dateOfBirth: formattedDate, bio });
      
      const response = await axios.put(
        API_CONFIG.ENDPOINTS.AUTH.UPDATE_PROFILE,
        {
          fullName,
          phone,
          dateOfBirth: formattedDate,
          bio,
        },
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      console.log('✅ Backend response status:', response.status);
      console.log('✅ Backend response data:', response.data);

      // Save updated profile to AsyncStorage
      if (response.data.user) {
        console.log('💾 Saving to AsyncStorage...');
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          const updatedUser = {
            ...parsedUser,
            ...response.data.user,
          };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('✅ Profile saved to AsyncStorage');
          console.log('📋 Updated profile:', updatedUser);
        } else {
          console.log('⚠️ No existing user data in AsyncStorage');
        }
      } else {
        console.log('⚠️ No user data in backend response');
      }

      setIsEditing(false);
      console.log('=== SAVE PROFILE END (SUCCESS) ===\n');
      Alert.alert('Success', 'Your profile has been updated successfully!');
    } catch (error) {
      console.error('\n❌ Error saving profile');
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      
      let errorMessage = 'Failed to save profile. Please try again.';
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        errorMessage = error.response?.data?.error || error.message;
      }
      
      console.log('=== SAVE PROFILE END (ERROR) ===\n');
      Alert.alert('Error', errorMessage);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out?',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Yes, Log Out',
          onPress: async () => {
            try {
              // Clear all stored auth data
              await AsyncStorage.removeItem('token');
              await AsyncStorage.removeItem('user');
              await AsyncStorage.removeItem('userEmail');
              
              // Route to login page
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to log out. Please try again.');
              console.error('Logout error:', error);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
      <Text style={styles.heading}>Profile</Text>
      <Text style={styles.subHeading}>Manage your account</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarOuter}
          onPress={handlePickImage}
          disabled={uploading}
        >
          {profileImageUri ? (
            <>
              <Image
                source={{ uri: profileImageUri }}
                style={styles.avatar}
              />
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              )}
            </>
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.cameraIcon}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="camera-outline" size={16} color={Colors.text} />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Form card */}
      <View style={styles.formCard}>
        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="people-outline" size={16} color={Colors.gray} />
            <Text style={styles.fieldLabel}>Full Name</Text>
          </View>
          <View style={styles.fieldInput}>
            {isEditing ? (
              <TextInput
                style={styles.fieldTextInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.border}
              />
            ) : (
              <Text style={styles.fieldValue}>{fullName}</Text>
            )}
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="mail-outline" size={16} color={Colors.gray} />
            <Text style={styles.fieldLabel}>Email</Text>
          </View>
          <View style={styles.fieldInput}>
            {isEditing ? (
              <TextInput
                style={styles.fieldTextInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.border}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.fieldValue}>{email}</Text>
            )}
          </View>
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="call-outline" size={16} color={Colors.gray} />
            <Text style={styles.fieldLabel}>Phone</Text>
          </View>
          <View style={styles.fieldInput}>
            {isEditing ? (
              <TextInput
                style={styles.fieldTextInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={Colors.border}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={phone ? styles.fieldValue : styles.fieldPlaceholder}>
                {phone || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.gray} />
            <Text style={styles.fieldLabel}>Date of Birth</Text>
          </View>
          <View style={styles.fieldInput}>
            {isEditing ? (
              <TextInput
                style={styles.fieldTextInput}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="DD/MM/YYYY (e.g., 15/03/1990)"
                placeholderTextColor={Colors.border}
                keyboardType="numbers-and-punctuation"
              />
            ) : (
              <Text style={dateOfBirth ? styles.fieldValue : styles.fieldPlaceholder}>
                {dateOfBirth || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="document-text-outline" size={16} color={Colors.gray} />
            <Text style={styles.fieldLabel}>Bio</Text>
          </View>
          <View style={[styles.fieldInput, styles.bioFieldInput]}>
            {isEditing ? (
              <TextInput
                style={[styles.fieldTextInput, styles.bioTextInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor={Colors.border}
                multiline={true}
                numberOfLines={4}
              />
            ) : (
              <Text style={bio ? styles.fieldValue : styles.fieldPlaceholder}>
                {bio || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        {/* Edit / Save button */}
        <TouchableOpacity
          style={[styles.editBtn, isEditing && styles.editBtnActive]}
          onPress={isEditing ? handleSaveProfile : () => setIsEditing(true)}
        >
          <Text
            style={[
              styles.editBtnText,
              isEditing && styles.editBtnTextActive,
            ]}
          >
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Menu items */}
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.menuIcon}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Log out */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={Colors.accent} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
      </ScrollView>

      <GuestLoginModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        feature="Profile"
      />
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Header */
  heading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  subHeading: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
    marginBottom: 24,
  },

  /* Avatar */
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarOuter: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F0E5C0',
    overflow: 'hidden',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  avatarLetter: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 38,
    color: Colors.primary,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDF6E0',
    borderWidth: 2,
    borderColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: Colors.text,
  },
  email: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },

  /* Form card */
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cream,
    padding: 18,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.gray,
  },
  fieldInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  fieldValue: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  fieldTextInput: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    height: 46,
    paddingVertical: 0,
  },
  fieldPlaceholder: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.border,
  },
  bioFieldInput: {
    height: 'auto',
    minHeight: 100,
    paddingVertical: 12,
  },
  bioTextInput: {
    height: 'auto',
    minHeight: 80,
    textAlignVertical: 'top',
    paddingVertical: 12,
  },
  editBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  editBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  editBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  editBtnTextActive: {
    color: Colors.text,
  },

  /* Menu */
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cream,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
    color: Colors.text,
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.cream,
  },
  logoutText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.accent,
  },
});
