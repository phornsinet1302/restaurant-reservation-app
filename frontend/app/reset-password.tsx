import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppToast } from '@/components/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const { toast, confirm } = useAppToast();
  const insets = useSafeAreaInsets();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { email, resetCode } = useLocalSearchParams();

  // Determine if this is the forgot-password flow (has code) or settings flow
  const isForgotFlow = !!email && !!resetCode;

  const validateForm = () => {
    if (isForgotFlow && (!email || !resetCode)) {
      toast('Invalid session. Please try forgot password again.', 'error');
      return false;
    }

    if (!newPassword || !confirmPassword) {
      toast('Please enter both password fields', 'error');
      return false;
    }

    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return false;
    }

    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isForgotFlow) {
        // Forgot-password flow: use reset code
        await axios.post(
          `${API_CONFIG.BASE_URL}/api/auth/reset-password-with-code`,
          { email, resetCode, newPassword }
        );
      } else {
        // Settings flow: use JWT token
        const token = await AsyncStorage.getItem('token');
        
        // Check if token exists - if not, session has expired
        if (!token) {
          toast('Your session has expired. Please login again.', 'error');
          router.replace('/login');
          return;
        }

        await axios.post(
          `${API_CONFIG.BASE_URL}/api/auth/reset-password`,
          { password: newPassword, confirmPassword },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      confirm('Success', 'Your password has been reset successfully. Please login with your new password.', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to reset password. Please try again.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = newPassword.length >= 6 && newPassword === confirmPassword && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Password</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={44} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.subtitle}>
          Create a strong new password for your account
        </Text>

        {/* Form */}
        <View style={styles.form}>
          {/* New Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              New Password <Text style={{ color: Colors.error }}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={Colors.gray}
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>At least 6 characters</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Confirm Password <Text style={{ color: Colors.error }}>*</Text>
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.gray}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Match Indicator */}
          {newPassword.length > 0 && confirmPassword.length > 0 && (
            <View style={[
              styles.matchBadge,
              { backgroundColor: newPassword === confirmPassword ? '#E8F5E9' : '#FFEBEE' },
            ]}>
              <Ionicons
                name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={newPassword === confirmPassword ? '#4CAF50' : '#F44336'}
              />
              <Text style={[
                styles.matchText,
                { color: newPassword === confirmPassword ? '#4CAF50' : '#F44336' },
              ]}>
                {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, !canSubmit && { opacity: 0.5 }]}
          onPress={handleResetPassword}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveBtnText}>Save New Password</Text>
          )}
        </TouchableOpacity>

        {/* Back to login */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.linkAction}>Login here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 20,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingRight: 4,
  },
  input: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  eyeBtn: {
    padding: 10,
  },
  helperText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 6,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  matchText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    marginLeft: 8,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: '#000',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  linkAction: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
});

