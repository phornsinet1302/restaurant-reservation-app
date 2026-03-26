import React, { useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Apple from 'expo-apple-authentication';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import CustomButton from '@/components/CustomButton';
import { API_CONFIG } from '@/app/config/apiConfig';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Email/Password, Step 2: Full Profile

  // Use Web Client ID for Expo Go testing
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID';

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'YOUR_IOS_CLIENT_ID',
    webClientId: webClientId,
    scopes: ['profile', 'email'],
    usePKCE: true,
  });

  const handleGoogleSignUp = async () => {
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
        const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.GOOGLE_SIGNUP, {
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
          
          Alert.alert('Success', 'Signed up with Google successfully!');
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
      console.error('Google signup exception:', error);
      if (axios.isAxiosError(error)) {
        Alert.alert('Error', error.response?.data?.error || error.message);
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Google sign up failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
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
        // Send token to backend to verify and create user
        const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.APPLE_SIGNUP, {
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
          
          Alert.alert('Success', 'Signed up with Apple successfully!');
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
        Alert.alert('Error', 'Apple sign up failed');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Step 1: Validate Email & Password
    if (step === 1) {
      if (!email || !password) {
        alert('Please enter email and password');
        return;
      }

      if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }

      // Move to step 2 (Profile details)
      setStep(2);
      return;
    }

    // Step 2: Collect Full Profile & Register
    if (step === 2) {
      if (!fullName || !phone) {
        alert('Please enter full name and phone number');
        return;
      }

      setLoading(true);
      try {
        console.log('Attempting signup with:', { 
          email, 
          fullName, 
          phone,
          dateOfBirth,
          bio,
          password: '***' 
        });
        
        const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
          email,
          password,
          role: 'customer',
          fullName,
          phone,
          dateOfBirth: dateOfBirth || null,
          bio: bio || null,
        });
        
        console.log('Signup response:', response.data);
        console.log('Full response data structure:', JSON.stringify(response.data, null, 2));
        
        // Store token and user info
        let token = null;
        
        // Try multiple paths to find the token
        if (response.data.access_token) {
          token = response.data.access_token;
          console.log('✓ Token found in response.data.access_token (primary)');
        } else if (response.data.session?.access_token) {
          token = response.data.session.access_token;
          console.log('✓ Token found in response.data.session.access_token (fallback 1)');
        } else if (response.data.session) {
          console.log('⚠️  Session exists but no direct access_token found. Session structure:', response.data.session);
          token = response.data.session.access_token;
        } else {
          console.log('❌ No session or access_token found in response');
        }
        
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
        } else {
          console.log('⚠️  WARNING: No token could be extracted from signup response!');
          console.log('Response keys:', Object.keys(response.data));
        }
        
        // Also store user info for later use
        if (response.data.user) {
          await AsyncStorage.setItem('user', JSON.stringify({
            ...response.data.user,
            fullName,
            phone,
            dateOfBirth,
            bio
          }));
          console.log('User info stored:', response.data.user.email);
        }

        // Send verification email
        try {
          console.log('Sending verification email to:', email);
          await axios.post(API_CONFIG.ENDPOINTS.AUTH.SEND_VERIFICATION_EMAIL, {
            email,
          });
          console.log('Verification email sent successfully');
        } catch (emailError) {
          console.log('Error sending verification email:', emailError);
          // Don't fail the signup if email sending fails, just log it
        }

        Alert.alert('Success', 'Signup successful! Please verify your email.');
        // Route to email verification page
        router.replace({
          pathname: '/verify-email',
          params: { email }
        });
      } catch (error) {
        console.log('Signup error:', error);
        let errorMessage = 'Signup failed. Please try again.';
        
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
        
        alert('Error: ' + errorMessage);
      } finally {
        setLoading(false);
      }
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
          <Ionicons name="person-add-outline" size={28} color={Colors.primary} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Create an account</Text>
        <Text style={styles.subtitle}>
          {step === 1 
            ? 'To get personal perks, book your table and create your memories with us'
            : 'Tell us more about yourself'}
        </Text>

        {/* Input fields - Step 1: Email & Password */}
        {step === 1 && (
          <View style={styles.inputsContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
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
                placeholder="Create a password (min 6 chars)"
                placeholderTextColor={Colors.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>
        )}

        {/* Input fields - Step 2: Profile Details */}
        {step === 2 && (
          <View style={styles.inputsContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.gray}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={Colors.gray}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (DD/MM/YYYY) - Optional"
                placeholderTextColor={Colors.gray}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.bioWrapper}>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="Bio / About You - Optional"
                placeholderTextColor={Colors.gray}
                value={bio}
                onChangeText={setBio}
                multiline={true}
                numberOfLines={4}
              />
            </View>
          </View>
        )}

        {/* Next/Sign Up button */}
        <CustomButton
          title={
            step === 1 
              ? 'Next' 
              : loading ? 'Creating Account...' : 'Complete Sign Up'
          }
          onPress={handleSignUp}
          disabled={loading}
          variant="primary"
        />

        {/* Back button for Step 2 */}
        {step === 2 && (
          <TouchableOpacity 
            style={styles.backToStep1}
            onPress={() => setStep(1)}
          >
            <Text style={styles.backToStep1Text}>← Back</Text>
          </TouchableOpacity>
        )}

        {/* Divider - Only show on Step 1 */}
        {step === 1 && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons - Only show on Step 1 */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignUp}
                disabled={googleLoading || !request}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.socialText}>{googleLoading ? 'Signing up...' : 'Sign up with Google'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignUp}
                disabled={appleLoading}
              >
                <Ionicons name="logo-apple" size={20} color={Colors.text} />
                <Text style={styles.socialText}>{appleLoading ? 'Signing up...' : 'Sign up with Apple'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/login' as any)}>
            <Text style={styles.footerLink}>log in</Text>
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
  bioWrapper: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  input: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
  },
  bioInput: {
    height: 'auto',
    minHeight: 80,
    paddingVertical: 12,
    textAlignVertical: 'top',
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
  backToStep1: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  backToStep1Text: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.primary,
  },
});
