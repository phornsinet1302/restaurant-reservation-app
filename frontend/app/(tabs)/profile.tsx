import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';

/* ── Data ── */

const MENU_ITEMS = [
  { icon: 'heart-outline' as const, label: 'Favorite Restaurants', route: '/favorites' },
  { icon: 'notifications-outline' as const, label: 'Notifications', route: '/notifications' },
  { icon: 'shield-checkmark-outline' as const, label: 'Privacy & Security', route: '/privacy-security' },
  { icon: 'help-circle-outline' as const, label: 'Help & Support', route: '/help-support' },
];

/* ── Component ── */

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('Google User');
  const [email, setEmail] = useState('google.social@rra.app');
  const [phone, setPhone] = useState('');

  const handleSaveProfile = () => {
    setIsEditing(false);
    Alert.alert('Profile Updated', 'Your profile has been saved successfully.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={styles.heading}>Profile</Text>
      <Text style={styles.subHeading}>Manage your account</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.cameraIcon}>
            <Ionicons name="camera-outline" size={16} color={Colors.text} />
          </TouchableOpacity>
        </View>
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
        onPress={() => router.replace('/')}
      >
        <Ionicons name="log-out-outline" size={20} color={Colors.accent} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
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
