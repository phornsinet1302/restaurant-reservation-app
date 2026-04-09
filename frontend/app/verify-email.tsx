import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

const API_URL = API_CONFIG.BASE_URL;

export default function VerifyEmailScreen() {
  const { toast } = useAppToast();
  const [codes, setCodes] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const { email } = useLocalSearchParams();

  React.useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const handleCodeChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return; // Only numbers

    const newCodes = [...codes];
    newCodes[index] = value;
    setCodes(newCodes);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all codes are filled
    if (newCodes.every(c => c)) {
      handleVerify(newCodes.join(''));
    }
  };

  const handleBackspace = (index: number) => {
    if (!codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const verificationCode = (code || codes.join('')).trim(); // Ensure trimmed
    
    if (verificationCode.length !== 6) {
      toast('Please enter all 6 digits', 'error');
      return;
    }
    
    // Validate that all characters are digits
    if (!/^\d{6}$/.test(verificationCode)) {
      toast('Verification code must contain only 6 digits', 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying email code:', verificationCode, 'for email:', email);
      
      // Call backend to verify the code
      const response = await axios.post(`${API_URL}/api/auth/verify-email-code`, { 
        email,
        code: verificationCode // Send as string
      });

      console.log('Verification response:', response.data);
      console.log('Full response structure:', JSON.stringify(response.data, null, 2));
      console.log('Response status:', response.status);
      console.log('Response headers:', JSON.stringify(response.headers, null, 2));
      
      // Extract token from response (try multiple paths)
      let token = null;
      if (response.data.access_token) {
        token = response.data.access_token;
        console.log('✓ Token found at response.data.access_token');
      } else if (response.data.session?.access_token) {
        token = response.data.session.access_token;
        console.log('✓ Token found at response.data.session.access_token');
      } else {
        console.log('❌ NO TOKEN FOUND IN RESPONSE!');
        console.log('Response keys:', Object.keys(response.data));
        console.log('If session exists, session keys:', response.data.session ? Object.keys(response.data.session) : 'N/A');
        if (response.data.session) {
          console.log('Session data:', JSON.stringify(response.data.session, null, 2));
        }
        console.log('Full response data:', JSON.stringify(response.data, null, 2));
      }
      
      // Store the token
      if (token) {
        console.log('=== TOKEN STORAGE START ===');
        console.log('Token length:', token.length);
        console.log('Token first 30 chars:', token.substring(0, 30));
        
        await AsyncStorage.setItem('token', token);
        
        // Verify it was actually stored
        const storedToken = await AsyncStorage.getItem('token');
        console.log('Verification - Token retrieved:', storedToken ? '✓ YES' : '✗ NO');
        console.log('Verification - Tokens match:', storedToken === token ? '✓ YES' : '✗ NO');
        console.log('=== TOKEN STORAGE END ===');
        
        if (!storedToken) {
          console.error('❌ CRITICAL: Token was not actually stored!');
          toast('Failed to store authentication token. Please try again.', 'error');
          return;
        }
      } else {
        console.error('❌ CRITICAL: No token in verification response');
        toast('No authentication token received. Please try again.', 'error');
        return;
      }
      
      // Also store user info if provided
      if (response.data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('✓ User info stored for:', response.data.user.email);
      }
      
      // Clear guest mode flag
      await AsyncStorage.removeItem('guestMode');
      
      console.log('✓ All data stored successfully. Navigating to home...');
      toast('Email verified successfully!', 'success');
      
      // Add a small delay to ensure everything is flushed to disk
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate directly to home page (profile was already created during signup)
      router.replace('/(tabs)');
    } catch (error) {
      let errorMessage = 'Failed to verify email. Please try again.';
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (error.response?.status === 404) {
          errorMessage = 'User not found. Please sign up again.';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      toast(errorMessage, 'error');
      
      // Reset the input fields for retry
      setCodes(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/resend-verification-code`, { 
        email 
      });

      toast('Verification code resent to your email', 'success');
      setTimer(60); // 60 second cooldown
      setCodes(['', '', '', '', '', '']); // Clear inputs
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast('Failed to resend code. Please try again.', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <Ionicons name="mail-outline" size={48} color={Colors.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {codes.map((code, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={styles.codeInput}
              value={code}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace') {
                  handleBackspace(index);
                }
              }}
              placeholder="-"
              placeholderTextColor={Colors.border}
              maxLength={1}
              keyboardType="numeric"
              selectionColor={Colors.primary}
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={() => handleVerify()}
          disabled={loading || !codes.every(c => c)}
        >
          <Text style={styles.verifyText}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </Text>
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive code? </Text>
          <TouchableOpacity 
            onPress={handleResendCode}
            disabled={timer > 0 || resendLoading}
          >
            <Text style={[
              styles.resendLink,
              (timer > 0 || resendLoading) && styles.resendDisabled
            ]}>
              {resendLoading ? 'Resending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  email: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  codeInput: {
    width: '14%',
    height: 54,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: '#000',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  resendLink: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
  resendDisabled: {
    opacity: 0.5,
  },
});
