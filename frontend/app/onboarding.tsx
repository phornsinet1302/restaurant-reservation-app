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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

const API_URL = API_CONFIG.BASE_URL;

export default function OnboardingScreen() {
  const { toast } = useAppToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Name, 2: Phone, 3: Bio
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const handleNextStep = () => {
    if (step === 1) {
      if (!fullName.trim()) {
        toast('Please enter your full name', 'error');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!phone.trim()) {
        toast('Please enter your phone number', 'error');
        return;
      }
      setStep(3);
    }
  };

  const handleSkip = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        toast('Session expired. Please login again.', 'error');
        router.push('/login');
        return;
      }

      await axios.post(
        `${API_URL}/api/auth/complete-profile-setup`,
        {
          fullName: fullName || 'User',
          phone: phone || null,
          bio: bio || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      toast('Profile setup completed!', 'success');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Onboarding error:', error);
      let errorMessage = 'Failed to complete profile setup. Please try again.';
      
      if (axios.isAxiosError(error)) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.status === 401) {
          errorMessage = 'Session expired. Please login again.';
        } else if (error.message) {
          errorMessage = error.message;
        }
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
        style={styles.scrollContent}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
        </View>
        <Text style={styles.stepCounter}>Step {step} of 3</Text>

        {/* Step 1: Full Name */}
        {step === 1 && (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.icon}>
                <Ionicons name="person-outline" size={48} color={Colors.primary} />
              </View>
            </View>

            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              We'd love to know how to address you
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={Colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={Colors.border}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </View>
          </>
        )}

        {/* Step 2: Phone */}
        {step === 2 && (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.icon}>
                <Ionicons name="call-outline" size={48} color={Colors.primary} />
              </View>
            </View>

            <Text style={styles.title}>Your phone number</Text>
            <Text style={styles.subtitle}>
              We'll use this for reservation confirmations
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color={Colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  placeholderTextColor={Colors.border}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!loading}
                />
              </View>
            </View>
          </>
        )}

        {/* Step 3: Bio */}
        {step === 3 && (
          <>
            <View style={styles.iconContainer}>
              <View style={styles.icon}>
                <Ionicons name="document-text-outline" size={48} color={Colors.primary} />
              </View>
            </View>

            <Text style={styles.title}>Tell us about yourself</Text>
            <Text style={styles.subtitle}>
              Optional: Share your food preferences or dietary restrictions
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio (Optional)</Text>
              <View style={[styles.inputContainer, styles.bioContainer]}>
                <TextInput
                  style={styles.bioInput}
                  placeholder="E.g., Vegetarian, love spicy food..."
                  placeholderTextColor={Colors.border}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  maxLength={200}
                  editable={!loading}
                />
              </View>
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>
          </>
        )}

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          {step < 3 && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}

          {step === 3 && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={handleNextStep}
              disabled={loading}
            >
              <Text style={styles.nextText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={completeOnboarding}
              disabled={loading}
            >
              <Text style={styles.completeText}>
                {loading ? 'Completing...' : 'Complete Setup'}
              </Text>
            </TouchableOpacity>
          )}
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
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  progressContainer: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepCounter: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 30,
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
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: 30,
  },
  formGroup: {
    marginBottom: 30,
  },
  label: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
  },
  bioContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 100,
    alignItems: 'flex-start',
  },
  bioInput: {
    flex: 1,
    paddingHorizontal: 0,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'right',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  skipText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: '#000',
  },
  completeBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: '#000',
  },
});
