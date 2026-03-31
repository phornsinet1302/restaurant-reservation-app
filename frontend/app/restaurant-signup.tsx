import React, { useState } from 'react';
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
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';

const STEPS = [
  { label: 'Account', progress: 0.17 },
  { label: 'Identity', progress: 0.50 },
  { label: 'Restaurant', progress: 0.83 },
  { label: 'Review', progress: 1.0 },
];

const NEXT_LABELS = ['Verify', 'Business', 'Review', 'Submit'];

const CITY_OPTIONS = [
  'Phnom Penh', 'Siem Reap', 'Battambang', 'Sihanoukville',
  'Kampong Cham', 'Kampot', 'Kep', 'Takeo',
];
const CATEGORY_OPTIONS = [
  'Khmer restaurant', 'Café', 'Bar & Grill', 'Fast food',
  'Fine dining', 'Street food', 'Bakery',
];
const CUISINE_OPTIONS = [
  'Asian fusion', 'Khmer', 'Chinese', 'Japanese',
  'Western', 'Thai', 'Vietnamese', 'Italian',
];

export default function RestaurantSignupScreen() {
  const [step, setStep] = useState(0);

  // Step 1 — Account
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 — Identity
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [city, setCity] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [address, setAddress] = useState('');

  // Step 3 — Restaurant
  const [restNameKhmer, setRestNameKhmer] = useState('');
  const [restNameEnglish, setRestNameEnglish] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [cuisine, setCuisine] = useState('');
  const [showCuisinePicker, setShowCuisinePicker] = useState(false);
  const [restPhone, setRestPhone] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [restCity, setRestCity] = useState('');
  const [showRestCityPicker, setShowRestCityPicker] = useState(false);
  const [mapsLink, setMapsLink] = useState('');

  // Step 4 — Review
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep(step - 1);
    }
  };

  const submitApplication = async () => {
    setLoading(true);
    try {
      // Retrieve role from AsyncStorage (set during account-type selection)
      const selectedRole = await AsyncStorage.getItem('selectedRole') || 'restaurant';
      
      const payload = {
        email,
        password,
        role: selectedRole,
        fullName,
        identity: {
          legalName,
          dob,
          nationality,
          cityProvince: city,
          currentAddress: address,
        },
        restaurantProfile: {
          nameEn: restNameEnglish,
          nameKh: restNameKhmer,
          address: restAddress,
          city: restCity,
          phone: restPhone,
          category,
          cuisine,
          mapsLink,
        },
      };

      const response = await axios.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, payload);
      Alert.alert(
        'Application Submitted',
        'Your restaurant application has been submitted for review. We will contact you soon.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        Alert.alert('Error', error.response?.data?.error || error.message);
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Submission failed. Please try again.');
      }
    } finally {
      setLoading(false);
      // Clear the selected role after signup attempt
      await AsyncStorage.removeItem('selectedRole');
    }
  };

  const handleContinue = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (!confirmed) {
        Alert.alert('Please confirm', 'You must confirm all information is accurate before submitting.');
        return;
      }
      submitApplication();
    }
  };

  const continueLabel = step === 3 ? (loading ? 'Submitting...' : 'Submit application') : step === 0 ? 'Save and continue' : 'Continue';

  /* ── Dropdown helper ── */
  const renderDropdown = (
    options: string[],
    onSelect: (v: string) => void,
    onClose: () => void,
  ) => (
    <View style={styles.dropdownList}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={styles.dropdownItem}
          onPress={() => { onSelect(opt); onClose(); }}
        >
          <Text style={styles.dropdownItemText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  /* ── Step renderers ── */

  const renderStep1 = () => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="storefront-outline" size={22} color={Colors.primary} />
      </View>
      <Text style={styles.cardTitle}>Start your restaurant application</Text>
      <Text style={styles.cardSubtitle}>
        Choose the Cambodia registration path first, then create the owner account used for verification, review updates, and merchant access.
      </Text>

      <Text style={styles.fieldLabel}>Full name</Text>
      <View style={styles.inputWrapper}>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Enter full name" placeholderTextColor={Colors.border} />
      </View>

      <Text style={styles.fieldLabel}>Phone number</Text>
      <View style={styles.inputWrapper}>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Enter phone number" placeholderTextColor={Colors.border} keyboardType="phone-pad" />
      </View>

      <Text style={styles.fieldLabel}>Email</Text>
      <View style={styles.inputWrapper}>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Enter email" placeholderTextColor={Colors.border} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <Text style={styles.fieldLabel}>Password</Text>
      <View style={styles.inputWrapper}>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Create a password (min 6 chars)" placeholderTextColor={Colors.border} secureTextEntry />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="storefront-outline" size={22} color={Colors.primary} />
      </View>
      <Text style={styles.cardTitle}>Add personal identity details</Text>
      <Text style={styles.cardSubtitle}>
        Provide the legal identity information that supports Cambodia-focused onboarding and review.
      </Text>

      <Text style={styles.fieldLabel}>Legal full name</Text>
      <View style={styles.inputWrapper}>
        <TextInput style={styles.input} value={legalName} onChangeText={setLegalName} placeholder="Enter legal full name" placeholderTextColor={Colors.border} />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Date of birth</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={[styles.input, { flex: 1 }]} value={dob} onChangeText={setDob} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.border} />
            <Ionicons name="calendar-outline" size={18} color={Colors.gray} />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Nationality</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} value={nationality} onChangeText={setNationality} placeholder="Nationality" placeholderTextColor={Colors.border} />
          </View>
        </View>
      </View>

      <Text style={styles.fieldLabel}>City / province</Text>
      <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCityPicker(!showCityPicker)}>
        <Text style={city ? styles.inputText : styles.placeholderText}>{city || 'Select city'}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.gray} />
      </TouchableOpacity>
      {showCityPicker && renderDropdown(CITY_OPTIONS, setCity, () => setShowCityPicker(false))}

      <Text style={styles.fieldLabel}>Current address</Text>
      <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
        <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} placeholder="Enter current address" placeholderTextColor={Colors.border} multiline />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="location-outline" size={22} color={Colors.primary} />
      </View>
      <Text style={styles.cardTitle}>Create the restaurant profile</Text>
      <Text style={styles.cardSubtitle}>
        Add the public business details customers will rely on when browsing and booking.
      </Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Restaurant name{'\n'}(Khmer)</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} value={restNameKhmer} onChangeText={setRestNameKhmer} placeholder="ឈ្មោះ" placeholderTextColor={Colors.border} />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Restaurant name{'\n'}(English)</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} value={restNameEnglish} onChangeText={setRestNameEnglish} placeholder="Name" placeholderTextColor={Colors.border} />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Category</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
            <Text style={category ? styles.inputText : styles.placeholderText}>{category || 'Select'}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.gray} />
          </TouchableOpacity>
          {showCategoryPicker && renderDropdown(CATEGORY_OPTIONS, setCategory, () => setShowCategoryPicker(false))}
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Cuisine</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCuisinePicker(!showCuisinePicker)}>
            <Text style={cuisine ? styles.inputText : styles.placeholderText}>{cuisine || 'Select'}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.gray} />
          </TouchableOpacity>
          {showCuisinePicker && renderDropdown(CUISINE_OPTIONS, setCuisine, () => setShowCuisinePicker(false))}
        </View>
      </View>

      <Text style={styles.fieldLabel}>Restaurant phone</Text>
      <View style={styles.inputWrapper}>
        <TextInput style={styles.input} value={restPhone} onChangeText={setRestPhone} placeholder="Enter phone" placeholderTextColor={Colors.border} keyboardType="phone-pad" />
      </View>

      <Text style={styles.fieldLabel}>Address</Text>
      <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
        <TextInput style={[styles.input, styles.textArea]} value={restAddress} onChangeText={setRestAddress} placeholder="Enter address" placeholderTextColor={Colors.border} multiline />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>City / province</Text>
          <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowRestCityPicker(!showRestCityPicker)}>
            <Text style={restCity ? styles.inputText : styles.placeholderText}>{restCity || 'Select'}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.gray} />
          </TouchableOpacity>
          {showRestCityPicker && renderDropdown(CITY_OPTIONS, setRestCity, () => setShowRestCityPicker(false))}
        </View>
        <View style={styles.halfField}>
          <Text style={styles.fieldLabel}>Google Maps link</Text>
          <View style={styles.inputWrapper}>
            <TextInput style={styles.input} value={mapsLink} onChangeText={setMapsLink} placeholder="Paste link" placeholderTextColor={Colors.border} autoCapitalize="none" />
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name="checkmark-circle-outline" size={22} color={Colors.primary} />
      </View>
      <Text style={styles.cardTitle}>Review and submit</Text>
      <Text style={styles.cardSubtitle}>
        Check the full application before sending it for manual review and approval.
      </Text>

      <View style={styles.summaryTable}>
        <SummaryRow label="Owner" value={fullName} />
        <SummaryRow label="Email" value={email} />
        <SummaryRow label="Phone" value={phone} />
        <SummaryRow label="Legal name" value={legalName} />
        <SummaryRow label="Business" value={restPhone} />
        <SummaryRow label="Restaurant" value={restNameEnglish} />
        <SummaryRow label="City" value={restCity || city} last />
      </View>

      {/* Confirmation checkbox */}
      <TouchableOpacity style={styles.checkboxRow} onPress={() => setConfirmed(!confirmed)}>
        <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
          {confirmed && <Ionicons name="checkmark" size={16} color={Colors.white} />}
        </View>
        <Text style={styles.checkboxLabel}>I confirm all information is accurate.</Text>
      </TouchableOpacity>
    </View>
  );

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerLabel}>RESTAURANT SIGNUP</Text>
          <Text style={styles.headerStep}>Step {step + 1}: {STEPS[step].label}</Text>
        </View>
        <Text style={styles.headerPercent}>{Math.round(STEPS[step].progress * 100)}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryFaded]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.progressBarFill, { width: `${STEPS[step].progress * 100}%` }]}
        />
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {stepContent[step]()}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.nextHint}>
          <Text style={styles.nextHintLabel}>NEXT</Text>
          <Text style={styles.nextHintValue}>{NEXT_LABELS[step]}</Text>
        </View>
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={loading}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueBtn} activeOpacity={0.8} onPress={handleContinue} disabled={loading}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryFaded]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.continueBtnGradient}
            >
              <Text style={styles.continueBtnText}>{continueLabel}</Text>
              {step < 3 && <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── Summary row helper ── */
function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[summaryStyles.row, !last && summaryStyles.border]}>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={summaryStyles.value}>{value || '—'}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  label: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  value: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '60%',
  },
});

/* ── Main styles ── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.gray,
    textTransform: 'uppercase',
  },
  headerStep: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  headerPercent: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.gray,
  },

  /* Progress bar */
  progressBarBg: {
    height: 5,
    backgroundColor: Colors.border,
  },
  progressBarFill: {
    height: 5,
    borderRadius: 2.5,
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 10,
  },

  /* Card */
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 22,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    lineHeight: 28,
    color: Colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
    marginBottom: 22,
  },

  /* Fields */
  fieldLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
    marginTop: 14,
  },
  inputWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
  },
  inputText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
  },
  placeholderText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.border,
  },
  textAreaWrapper: {
    height: 90,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  textArea: {
    height: 66,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },

  /* Dropdown */
  dropdownList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
  },

  /* Summary table */
  summaryTable: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },

  /* Checkbox */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkboxLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 10,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  nextHint: {
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
  },
  nextHintLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.gray,
    textTransform: 'uppercase',
  },
  nextHintValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  backBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  backBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  continueBtn: {
    flex: 1,
  },
  continueBtnGradient: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  continueBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
