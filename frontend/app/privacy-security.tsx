import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

export default function PrivacySecurityScreen() {
  const { toast, confirm } = useAppToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast('Please enter your password to confirm.', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`${API_CONFIG.BASE_URL}/api/auth/delete-account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword },
      });
      setShowDeleteModal(false);
      await AsyncStorage.clear();
      confirm('Account Deleted', 'Your account has been permanently deleted.', [
          { text: 'OK', onPress: () => {
            // Dismiss all screens in the stack so back arrow can't return to deleted account
            while (router.canGoBack()) {
              router.back();
            }
            router.replace('/login' as any);
          } }
        ]);
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to delete account. Please try again.';
      toast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (user) setEmail(user.email || '');

        const token = await AsyncStorage.getItem('token');
        if (token) {
          const res = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.restaurant_name) setRestaurantName(res.data.restaurant_name);
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Privacy & Security</Text>
            <Text style={styles.headerSub}>Owner account and restaurant data controls</Text>
          </View>
        </View>

        {/* Top Card */}
        <View style={styles.card}>
          {/* Account email */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Account email</Text>
              <Text style={styles.rowValue}>{email || 's@gmail.com'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Restaurant access */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Restaurant access</Text>
              <Text style={styles.rowValue}>
                Owner tools enabled for {restaurantName || 'your restaurant'}
              </Text>
              <Text style={styles.rowDesc}>
                Dashboard, bookings, tables, and menu changes are tied to this account.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Password row */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Password and sign in</Text>
              <Text style={styles.rowDesc}>
                Reset your password if you suspect unauthorized access to the restaurant account.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => router.push('/reset-password' as any)}
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Handling Card */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="server-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowValue}>Data handling</Text>
              <Text style={styles.rowDesc}>
                Reservation details, customer reviews, and restaurant profile information are stored to operate your merchant tools and notify you about important account activity.
              </Text>
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={[styles.noteCard, { marginTop: 16 }]}>
          <Text style={styles.noteTitle}>Security note</Text>
          <Text style={styles.noteBody}>
            If the restaurant changes ownership or team access needs to be transferred, update your owner profile and contact support before sharing login credentials.
          </Text>
        </View>

        {/* Delete Account */}
        <View style={[styles.card, { marginTop: 16, borderColor: '#FF2424' }]}>
          <View style={styles.row}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFF0F0' }]}>
              <Ionicons name="trash-outline" size={20} color="#FF2424" />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowValue, { color: '#FF2424' }]}>Delete account</Text>
              <Text style={styles.rowDesc}>
                Permanently delete your account and all associated data. This action cannot be undone.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: '#FF2424' }]}
              onPress={() => {
                confirm('Delete Account', 'Are you sure you want to permanently delete your account? All your data will be lost and this cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Continue', style: 'destructive', onPress: () => setShowDeleteModal(true) },
                  ]);
              }}
            >
              <Text style={[styles.resetBtnText, { color: '#FF2424' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Account Verification Modal */}
        <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Verify your identity</Text>
              <Text style={styles.modalDesc}>Enter your password to permanently delete your account.</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={!showDeletePassword}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowDeletePassword(!showDeletePassword)}>
                  <Ionicons name={showDeletePassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.gray} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalDeleteBtn, deleteLoading && { opacity: 0.6 }]}
                  onPress={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalDeleteText}>Delete Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.gray,
  },
  rowValue: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  rowDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  resetBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },

  noteCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#FEFCF4',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  noteTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 8,
  },
  noteBody: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
  },

  /* Delete account modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: 8,
  },
  modalDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 20,
    lineHeight: 20,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FEFCF4',
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF2424',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: '#fff',
  },
});
