import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'newPassword'>('email');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleContinue = () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('Required', 'Please enter your email or phone number.');
      return;
    }
    setStep('newPassword');
  };

  const handleResetPassword = () => {
    if (newPassword.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    Alert.alert('Password Reset', 'Your password has been reset successfully.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => {
        if (step === 'newPassword') {
          setStep('email');
        } else {
          router.back();
        }
      }}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.body}>
        {/* Key icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="key-outline" size={32} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'Enter your email or phone to reset your password'
            : 'Enter your new password'}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Enter your email or phone"
              placeholderTextColor={Colors.gray}
              value={emailOrPhone}
              onChangeText={setEmailOrPhone}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="New password (min 6 characters)"
              placeholderTextColor={Colors.gray}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.gray}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword}>
              <Text style={styles.primaryBtnText}>Reset Password</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Bottom link */}
      <View style={styles.bottomRow}>
        <Text style={styles.bottomText}>Remember your password? </Text>
        <TouchableOpacity onPress={() => router.push('/login' as any)}>
          <Text style={styles.signInLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    marginTop: 60,
    marginLeft: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 26,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: 18,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 16,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.white,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  bottomText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  signInLink: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
});
