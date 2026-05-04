import React, { useState } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest, ResponseType } from 'expo-auth-session';
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
  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import CustomButton from '@/components/CustomButton';
import DatePickerInput from '@/components/DatePickerInput';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { toast, confirm } = useAppToast();
  const insets = useSafeAreaInsets();
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

  const handleGoogleSignUp = async () => {
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
        const backendResponse = await axios.post(API_CONFIG.ENDPOINTS.AUTH.GOOGLE_SIGNUP, {
          access_token: tokens.access_token,
        });

        console.log('Backend response:', backendResponse.data);
        const token =
          backendResponse.data.access_token ||
          backendResponse.data.session?.access_token;
        if (token) {
          await AsyncStorage.setItem('token', token);
          const authUser = backendResponse.data.user || backendResponse.data.session?.user;
          if (authUser) {
            await AsyncStorage.setItem('user', JSON.stringify(authUser));
          }
          // Critical: ensure we leave guest mode after OAuth sign up
          await AsyncStorage.removeItem('guestMode');
          toast('Signed up with Google successfully!', 'success');
          const oauthRole = authUser?.role;
          if (oauthRole === 'merchant' || oauthRole === 'restaurant') {
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
      console.error('Google signup error:', error);
      if (axios.isAxiosError(error)) {
        toast(error.response?.data?.error || error.message, 'error');
      } else {
        toast('Google signup failed. Please try again.', 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
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
          // Critical: ensure we leave guest mode after OAuth sign up
          await AsyncStorage.removeItem('guestMode');
          
          toast('Signed up with Apple successfully!', 'success');
          const appleRole = response.data.user?.role;
          if (appleRole === 'merchant' || appleRole === 'restaurant') {
            router.replace('/(merchant-tabs)');
          } else {
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
        toast('Apple sign up failed', 'error');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Step 1: Validate Email & Password
    if (step === 1) {
      const errors: Record<string, string> = {};
      if (!email.trim()) errors.email = 'Email is required';
      if (!password) errors.password = 'Password is required';
      else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});
      setStep(2);
      return;
    }

    // Step 2: Collect Full Profile & Register
    if (step === 2) {
      const errors: Record<string, string> = {};
      if (!fullName.trim()) errors.fullName = 'Full name is required';
      if (!phone.trim()) errors.phone = 'Phone number is required';
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
      setFieldErrors({});

      setLoading(true);
      try {
        // Retrieve role from AsyncStorage (set during account-type selection)
        const selectedRole = await AsyncStorage.getItem('selectedRole') || 'customer';
        
        console.log('Attempting signup with:', { 
          email,
          role: selectedRole,
          fullName, 
          phone,
          dateOfBirth,
          bio,
          password: '***' 
        });
        
        const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
          email,
          password,
          role: selectedRole,
          fullName,
          phone,
          dateOfBirth: dateOfBirth || null,
          bio: bio || null,
        });
        
        console.log('Signup response:', response.data);
        console.log('Full response data structure:', JSON.stringify(response.data, null, 2));
        
        // Keep user info for post-verification login bootstrap
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
        // Persist intended role until verification completes.
        await AsyncStorage.setItem('pendingSignupRole', selectedRole);

        // Restore email verification flow
        await axios.post(`${API_CONFIG.BASE_URL}/api/auth/send-verification-email`, {
          email,
        });
        console.log('✅ Verification code sent, redirecting to verify-email screen');
        toast('Verification code sent to your email', 'success');
        router.replace({
          pathname: '/verify-email',
          params: { email },
        } as any);
      } catch (error) {
        console.log('Signup error:', error);
        let errorMessage = 'Signup failed. Please try again.';
        let existingRole = null;
        
        if (axios.isAxiosError(error)) {
          const errorData = error.response?.data;
          console.log('Error response data:', errorData);
          if (errorData?.error) {
            errorMessage = errorData.error;
            existingRole = errorData?.existingRole;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        // Check if this is a duplicate email error
        if (errorMessage.includes('already registered')) {
          console.log('🔄 Email already registered, showing login redirect option...');
          confirm('Email Already Registered', `${errorMessage}\n\nWould you like to login with this email instead?`, [
              {
                text: 'Cancel',
                onPress: () => console.log('User cancelled'),
              },
              {
                text: 'Go to Login',
                onPress: async () => {
                  // Clear signup data and redirect to login
                  await AsyncStorage.removeItem('selectedRole');
                  router.replace('/login');
                },
              },
            ]);
        } else {
          alert('Error: ' + errorMessage);
        }
      } finally {
        setLoading(false);
        // Clear transient selection; verification uses pendingSignupRole.
        await AsyncStorage.removeItem('selectedRole');
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 16, 60), paddingBottom: Math.max(insets.bottom + 20, 40) },
        ]}
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
            <View>
              <Text style={styles.fieldLabel}>Email <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputWrapper, fieldErrors.email && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
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
                  placeholder="Create a password (min 6 chars)"
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
        )}

        {/* Input fields - Step 2: Profile Details */}
        {step === 2 && (
          <View style={styles.inputsContainer}>
            <View>
              <Text style={styles.fieldLabel}>Full Name <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputWrapper, fieldErrors.fullName && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.gray}
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); setFieldErrors(e => { const { fullName, ...rest } = e; return rest; }); }}
                  autoCapitalize="words"
                />
              </View>
              {fieldErrors.fullName && <Text style={styles.errorText}>{fieldErrors.fullName}</Text>}
            </View>
            <View>
              <Text style={styles.fieldLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
              <View style={[styles.inputWrapper, fieldErrors.phone && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor={Colors.gray}
                  value={phone}
                  onChangeText={(t) => { const clean = t.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, ''); setPhone(clean); setFieldErrors(e => { const { phone, ...rest } = e; return rest; }); }}
                  keyboardType="phone-pad"
                  maxLength={15}
                />
              </View>
              {fieldErrors.phone && <Text style={styles.errorText}>{fieldErrors.phone}</Text>}
            </View>
            <View>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <DatePickerInput
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="DD/MM/YYYY"
                editable={true}
                style={{ borderRadius: 16, height: 52 }}
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

            {/* Social buttons - DISABLED FOR NOW */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleGoogleSignUp}
                  disabled={googleLoading}
                >
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.socialText}>{googleLoading ? 'Opening Google...' : 'Sign up with Google'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleSignUp}
                  disabled={appleLoading}
                >
                  <Ionicons name="logo-apple" size={20} color={Colors.text} />
                  <Text style={styles.socialText}>{appleLoading ? 'Opening Apple...' : 'Sign up with Apple'}</Text>
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
