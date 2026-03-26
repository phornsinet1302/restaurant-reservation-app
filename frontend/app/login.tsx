import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Apple from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';

import CustomButton from '@/components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '@/app/config/apiConfig';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Use Web Client ID for Expo Go testing
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID';

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'YOUR_IOS_CLIENT_ID',
    webClientId: webClientId,
    scopes: ['profile', 'email'],
    usePKCE: true,
  });

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      console.log('Google auth result:', result);
      
      if (result?.type === 'success') {
        const { access_token } = result.params;
        
        if (!access_token) {
          Alert.alert('Error', 'Failed to get Google access token');
          return;
        }

        console.log('Sending access_token to backend...');
        const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.GOOGLE_LOGIN, {
          access_token,
        });

        console.log('Backend response:', response.data);
        const token = response.data.access_token || response.data.session?.access_token;
        if (token) {
          await AsyncStorage.setItem('token', token);
          
          // Also store user profile data from response
          if (response.data.user) {
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          }
          
          // Clear guest mode flag
          await AsyncStorage.removeItem('guestMode');
          
          Alert.alert('Success', 'Logged in with Google successfully!');
          router.replace('/(tabs)');
        } else {
          Alert.alert('Error', 'No token received from backend');
        }
      } else if (result?.type === 'error') {
        console.log('Google auth error:', result.params);
        Alert.alert('Error', `Authentication failed: ${result.params?.error || 'Unknown error'}`);
      } else {
        console.log('Google auth cancelled');
      }
    } catch (error) {
      console.error('Google login exception:', error);
      if (axios.isAxiosError(error)) {
        Alert.alert('Error', error.response?.data?.error || error.message);
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Google login failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign In is only available on iOS devices');
      return;
    }

    setAppleLoading(true);
    try {
      const credential = await Apple.signInAsync({
        requestedScopes: [Apple.AppleAuthenticationScope.EMAIL, Apple.AppleAuthenticationScope.FULL_NAME],
      });

      if (credential.identityToken) {
        const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.APPLE_LOGIN, {
          identityToken: credential.identityToken,
          user: credential.user,
        });

        const token = response.data.access_token || response.data.session?.access_token;
        if (token) {
          await AsyncStorage.setItem('token', token);
          
          // Also store user profile data from response
          if (response.data.user) {
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          }
          
          // Clear guest mode flag
          await AsyncStorage.removeItem('guestMode');
          
          Alert.alert('Success', 'Logged in with Apple successfully!');
          router.replace('/(tabs)');
        } else {
          Alert.alert('Error', 'No token received');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message !== 'User cancelled the sign-in flow.') {
          Alert.alert('Error', error.message);
        }
      } else {
        Alert.alert('Error', 'Apple login failed');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login with:', { email, password: '***' });
      
      const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });
      
      console.log('Login response:', response.data);
      
      const token = response.data.access_token || response.data.session?.access_token;
      if (token) {
        console.log('=== TOKEN STORAGE START ===');
        console.log('Token length:', token.length);
        console.log('Token first 30 chars:', token.slice(0, 30));
        console.log('Token last 10 chars:', token.slice(-10));
        
        await AsyncStorage.setItem('token', token);
        
        // Verify it was stored
        const verifyToken = await AsyncStorage.getItem('token');
        console.log('Verification - Token retrieved:', verifyToken ? 'YES ✓' : 'NO ❌');
        console.log('Verification - Tokens match:', verifyToken === token ? 'YES ✓' : 'NO ❌');
        console.log('=== TOKEN STORAGE END ===');
        
        // Also store user info for later use
        if (response.data.user) {
          console.log('💾 Saving user data to AsyncStorage:', response.data.user);
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          console.log('✅ User info stored successfully');
          console.log('📧 Email:', response.data.user.email);
          console.log('👤 Name:', response.data.user.fullName);
          console.log('📞 Phone:', response.data.user.phone);
          console.log('🎂 DOB:', response.data.user.dateOfBirth);
          console.log('📝 Bio:', response.data.user.bio);
        } else {
          console.log('⚠️ No user data in response');
        }
        
        // Clear guest mode flag
        await AsyncStorage.removeItem('guestMode');
        
        Alert.alert('Success', 'Logged in successfully!');
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Login failed: No token received');
      }
    } catch (error) {
      console.log('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        console.log('Error response data:', errorData);
        if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="log-in-outline" size={28} color={Colors.primary} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in to manage your bookings and discover restaurants
        </Text>

        {/* Input fields */}
        <View style={styles.inputsContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter your email or phone"
              placeholderTextColor={Colors.gray}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        {/* Sign in button */}
        <CustomButton
          title={loading ? 'Signing in...' : 'Sign in'}
          onPress={handleLogin}
          disabled={loading}
          variant="primary"
        />

        {/* Forgot password */}
        <TouchableOpacity 
          style={styles.forgotButton}
          onPress={() => router.push('/forgot-password')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialContainer}>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading || !request}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.socialText}>{googleLoading ? 'Signing in...' : 'Sign in with Google'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleLogin}
            disabled={appleLoading}
          >
            <Ionicons name="logo-apple" size={20} color={Colors.text} />
            <Text style={styles.socialText}>{appleLoading ? 'Signing in...' : 'Sign in with Apple'}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/signup' as any)}>
            <Text style={styles.footerLink}>Sign up</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  heading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: Colors.gray,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  inputsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  inputWrapper: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  input: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
  },
  forgotButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  forgotText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.primary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    paddingHorizontal: 16,
  },
  socialContainer: {
    gap: 12,
  },
  socialButton: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
  },
  googleIcon: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: '#E7BD27',
  },
  socialText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 32,
  },
  footerText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  footerLink: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
});
