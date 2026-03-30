import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import CustomButton from '@/components/CustomButton';
import { API_CONFIG } from '@/app/config/apiConfig';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { email, resetCode } = useLocalSearchParams();

  React.useEffect(() => {
    console.log('✅ ResetPasswordScreen mounted');
    console.log('   Email:', email);
    console.log('   Reset Code:', resetCode);
  }, [email, resetCode]);

  const validateForm = () => {
    if (!email || !resetCode) {
      Alert.alert('Error', 'Invalid session. Please try forgot password again.');
      return false;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter both password fields');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 Resetting password for email:', email);

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/auth/reset-password-with-code`,
        {
          email: email,
          resetCode: resetCode,
          newPassword: newPassword,
        }
      );

      console.log('✅ Password reset successful:', response.data);

      Alert.alert(
        'Success',
        'Your password has been reset successfully. Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/login');
            },
          },
        ]
      );
    } catch (error) {
      let errorMessage = 'Failed to reset password. Please try again.';

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
      }

      console.error('❌ Password reset error:', errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create New Password</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.icon}>
              <Ionicons name="lock-closed-outline" size={48} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.subtitle}>
            Create a strong new password for your account
          </Text>

          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor="#999"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.iconButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={Colors.text}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              At least 6 characters
            </Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#999"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.iconButton}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={Colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Match Indicator */}
          {newPassword && confirmPassword && (
            <View style={[
              styles.matchIndicator,
              {
                backgroundColor: newPassword === confirmPassword
                  ? '#D4F1D4'
                  : '#FFE0E0'
              }
            ]}>
              <Ionicons
                name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={newPassword === confirmPassword ? '#4CAF50' : '#F44336'}
              />
              <Text style={[
                styles.matchText,
                {
                  color: newPassword === confirmPassword ? '#4CAF50' : '#F44336'
                }
              ]}>
                {newPassword === confirmPassword
                  ? 'Passwords match'
                  : 'Passwords do not match'}
              </Text>
            </View>
          )}
        </View>

        {/* Reset Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title={loading ? 'Saving...' : 'Save New Password'}
            onPress={handleResetPassword}
            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            style={{
              opacity: loading || !newPassword || !confirmPassword || newPassword !== confirmPassword ? 0.6 : 1,
            }}
          />
        </View>

        {/* Back to Login Link */}
        <View style={styles.loginLinkContainer}>
          <Text style={styles.loginLinkText}>
            Remember your password?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.loginLink}>Login here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0E8DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingRight: 12,
    backgroundColor: '#F9F9F9',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
  },
  iconButton: {
    padding: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  matchText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});
