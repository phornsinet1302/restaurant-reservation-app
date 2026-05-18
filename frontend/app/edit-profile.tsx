import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EditProfileScreen() {
  const { toast } = useAppToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user) {
        setFullName(user.fullName || user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        if (user.profile_picture_url) {
          setProfilePictureUrl(user.profile_picture_url);
        }
      }

      // Also fetch latest from backend to get fresh profile_picture_url
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const res = await axios.get(`${API_CONFIG.BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          });
          if (res.data?.user) {
            const backendUser = res.data.user;
            if (backendUser.profile_picture_url) {
              setProfilePictureUrl(backendUser.profile_picture_url);
              // Sync to AsyncStorage
              const u = userStr ? JSON.parse(userStr) : {};
              u.profile_picture_url = backendUser.profile_picture_url;
              await AsyncStorage.setItem('user', JSON.stringify(u));
            }
          }
        } catch {}
      }
    } catch {}
  };

  const pickAndUploadImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast('Please allow access to your photo library.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        console.log('📸 Selected image:', image.uri);

        setUploadingImage(true);
        const token = await AsyncStorage.getItem('token');

        // Create FormData
        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          type: 'image/jpeg',
          name: `profile_${Date.now()}.jpg`,
        } as any);

        console.log('📤 Uploading profile picture to backend...');
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/auth/upload-profile-picture`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Upload failed (${response.status})`);
        }

        const newUrl = data.profile_picture_url;
        console.log('✅ Profile picture uploaded:', newUrl.substring(0, 60) + '...');

        setProfilePictureUrl(newUrl);

        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : {};
        user.profile_picture_url = newUrl;
        await AsyncStorage.setItem('user', JSON.stringify(user));

        toast('Profile picture updated!', 'success');
        setUploadingImage(false);
      }
    } catch (error: any) {
      console.error('❌ Image upload failed:', error.message);
      toast(error.message, 'error');
      setUploadingImage(false);
    }
  };

  const getInitial = () => fullName ? fullName.charAt(0).toUpperCase() : 'U';

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast('Full name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(
        `${API_CONFIG.BASE_URL}/api/auth/update-profile`,
        { fullName: fullName.trim(), phone: phone.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local storage
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      user.fullName = fullName.trim();
      user.name = fullName.trim();
      user.phone = phone.trim();
      await AsyncStorage.setItem('user', JSON.stringify(user));
      toast('Your profile has been updated.', 'success');
    } catch {
      toast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          {profilePictureUrl ? (
            <Image source={{ uri: profilePictureUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarLetter}>{getInitial()}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.cameraIcon}
          onPress={pickAndUploadImage}
          disabled={uploadingImage}
        >
          <Ionicons 
            name={uploadingImage ? "hourglass" : "camera"} 
            size={14} 
            color={Colors.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          placeholderTextColor={Colors.gray}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, { color: Colors.gray }]}
          value={email}
          editable={false}
          placeholder="Email"
          placeholderTextColor={Colors.gray}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, ''))}
          placeholder="+855 12 345 678"
          placeholderTextColor={Colors.gray}
          keyboardType="phone-pad"
          maxLength={15}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  saveText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.primary,
  },

  avatarSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 28,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F5F0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 36,
    color: Colors.primary,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: '38%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  label: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
  },
});
