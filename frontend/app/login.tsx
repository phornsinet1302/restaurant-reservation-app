import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, } from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest, ResponseType } from 'expo-auth-session';
import * as Apple from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';

import CustomButton from '@/components/CustomButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, api } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { toast } = useAppToast();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Use iOS client ID with its native reverse scheme (bypasses auth.expo.io proxy)
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
  const googleRedirectUri = Platform.OS === 'ios'
    ? `com.googleusercontent.apps.${iosClientId.split('.apps.googleusercontent.com')[0]}:/oauthredirect`
    : 'https://auth.expo.io/@fr3_bin/restaurant-table-order-app';

  const googleClientId = Platform.OS === 'ios'
    ? iosClientId
    : process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: googleClientId,
      redirectUri: googleRedirectUri,
      scopes: ['openid', 'profile', 'email'],
      responseType: ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      console.log('Google auth result:', result);
      
      if (result?.type === 'success') {
        const { code } = result.params;
        
        if (!code) {
          toast('Failed to get authorization code', 'error');
          return;
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: googleClientId,
            redirect_uri: googleRedirectUri,
            grant_type: 'authorization_code',
            code_verifier: request?.codeVerifier || '',
          }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
          toast(tokens.error_description || 'Token exchange failed', 'error');
          return;
        }

        console.log('Sending access_token to backend...');
        const backendResponse = await api.post('/api/auth/google-login', {
          access_token: tokens.access_token,
        });

        const token = backendResponse.data.session?.access_token;
        if (token) {
          await AsyncStorage.setItem('token', token);
          if (backendResponse.data.user) {
            await AsyncStorage.setItem('user', JSON.stringify(backendResponse.data.user));
          }
          await AsyncStorage.removeItem('guestMode');
          
          const googleUserRole = backendResponse.data.user?.role;
          if (googleUserRole === 'merchant' || googleUserRole === 'restaurant') {
            router.replace('/(merchant-tabs)');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          toast('No token received from backend', 'error');
        }
      } else if (result?.type === 'error') {
        toast(`Authentication failed: ${result.params?.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Google login error:', error);
      if (axios.isAxiosError(error)) {
        const msg = error.code === 'ECONNABORTED'
          ? 'Server is not reachable. Check your network connection.'
          : (error.response?.data?.error || error.message);
        toast(msg, 'error');
      } else {
        toast('Google login failed. Please try again.', 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      toast('Apple Sign In is only available on iOS devices', 'error');
      return;
    }

    setAppleLoading(true);
    try {
      const credential = await Apple.signInAsync({
        requestedScopes: [Apple.AppleAuthenticationScope.EMAIL, Apple.AppleAuthenticationScope.FULL_NAME],
      });

      if (credential.identityToken) {
        const response = await api.post('/api/auth/apple-login', {
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
          
          const appleUserRole = response.data.user?.role;
          if (appleUserRole === 'merchant' || appleUserRole === 'restaurant') {
            toast('Logged in with Apple successfully!', 'success');
            router.replace('/(merchant-tabs)');
          } else {
            toast('Logged in with Apple successfully!', 'success');
            router.replace('/(tabs)');
          }
        } else {
          toast('No token received', 'error');
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message !== 'User cancelled the sign-in flow.') {
          toast(error.message, 'error');
        }
      } else {
        toast('Apple login failed', 'error');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      
      const token = response.data.access_token || response.data.session?.access_token;
      if (token) {
        await AsyncStorage.setItem('token', token);
        
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        await AsyncStorage.removeItem('guestMode');
        
        const userRole = response.data.user?.role;
        if (userRole === 'merchant' || userRole === 'restaurant') {
          router.replace('/(merchant-tabs)');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        toast('Login failed: No token received', 'error');
      }
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Server is not reachable. Check your network connection.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast(errorMessage, 'error');
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 16, 60), paddingBottom: Math.max(insets.bottom + 20, 40) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/' as any);
          }
        }}>
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
          <View>
            <Text style={styles.fieldLabel}>Email <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, fieldErrors.email && styles.inputWrapperError]}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email or phone"
                placeholderTextColor={Colors.gray}
                value={email}
                onChangeText={(t) => { setEmail(t); setFieldErrors(e => { const { email, ...rest } = e; return rest; }); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}
          </View>
          <View>
            <Text style={styles.fieldLabel}>Password <Text style={styles.required}>*</Text></Text>
            <View style={[styles.inputWrapper, styles.passwordWrapper, fieldErrors.password && styles.inputWrapperError]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.gray}
                value={password}
                onChangeText={(t) => { setPassword(t); setFieldErrors(e => { const { password, ...rest } = e; return rest; }); }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}
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
            disabled={googleLoading}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.socialText}>{googleLoading ? 'Opening Google...' : 'Sign in with Google'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleLogin}
            disabled={appleLoading}
          >
            <Ionicons name="logo-apple" size={20} color={Colors.text} />
            <Text style={styles.socialText}>{appleLoading ? 'Opening Apple...' : 'Sign in with Apple'}</Text>
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
  inputWrapperError: {
    borderColor: Colors.error,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    padding: 8,
    marginRight: -8,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  required: {
    color: Colors.error,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
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
