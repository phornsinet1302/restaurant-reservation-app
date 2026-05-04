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
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import CustomButton from '@/components/CustomButton';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useAppToast } from '@/components/ToastProvider';

export default function VerifyResetCodeScreen() {
  const { toast } = useAppToast();
  const [resetCode, setResetCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { email } = useLocalSearchParams();

  React.useEffect(() => {
    console.log('✅ VerifyResetCodeScreen mounted, email:', email);
  }, [email]);

  const validateCode = () => {
    if (!email) {
      toast('Email not found. Please try forgot password again.', 'error');
      return false;
    }

    if (!resetCode) {
      toast('Please enter the 6-digit code', 'error');
      return false;
    }

    if (resetCode.length !== 6 || isNaN(Number(resetCode))) {
      toast('Code must be exactly 6 digits', 'error');
      return false;
    }

    return true;
  };

  const handleVerifyCode = async () => {
    if (!validateCode()) {
      return;
    }

    setLoading(true);
    try {
      console.log('Verifying reset code for email:', email);

      // Call backend to verify the code
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/auth/verify-reset-code`,
        {
          email: email,
          resetCode: resetCode.trim(),
        }
      );

      console.log('Code verification successful:', response.data);

      // If code is verified, navigate to reset password screen
      router.replace({
        pathname: '/reset-password',
        params: { email, resetCode: resetCode.trim() }
      });
    } catch (error) {
      let errorMessage = 'Invalid or expired code. Please check and try again.';

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
      }

      toast(errorMessage, 'error');
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
          <Text style={styles.title}>Verify Code</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.icon}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.primary} />
            </View>
          </View>

          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to:
          </Text>
          <Text style={styles.email}>{email}</Text>

          {/* Reset Code Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>6-Digit Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
              value={resetCode}
              onChangeText={setResetCode}
              placeholderTextColor="#999"
              textAlign="center"
              editable={!loading}
            />
            <Text style={styles.helperText}>
              Check your email for the code
            </Text>
          </View>
        </View>

        {/* Verify Button */}
        <View style={styles.buttonContainer}>
          <CustomButton
            title={loading ? 'Verifying...' : 'Verify Code'}
            onPress={handleVerifyCode}
            disabled={loading || !resetCode}
            style={{
              opacity: loading || !resetCode ? 0.6 : 1,
            }}
          />
        </View>

        {/* Resend Link */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.resendLink}>Request new code</Text>
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
    alignItems: 'center',
  },
  iconContainer: {
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
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    backgroundColor: '#F9F9F9',
    letterSpacing: 12,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
});
