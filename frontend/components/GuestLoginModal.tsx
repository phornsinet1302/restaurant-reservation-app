import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import CustomButton from '@/components/CustomButton';

interface GuestLoginModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string; // e.g., "Booking", "Favorites", "Profile"
}

export default function GuestLoginModal({ visible, onClose, feature }: GuestLoginModalProps) {
  const handleLoginPress = () => {
    onClose();
    router.push('/login');
  };

  const handleSignupPress = () => {
    onClose();
    router.push('/account-type');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.primary} />
          </View>

          {/* Content */}
          <Text style={styles.title}>Login Required</Text>
          <Text style={styles.description}>
            You need to be logged in to access {feature.toLowerCase()}. Sign in to your account or create a new one.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <CustomButton
              title="Log In"
              onPress={handleLoginPress}
              variant="primary"
            />
            <CustomButton
              title="Sign Up"
              onPress={handleSignupPress}
              variant="outline"
            />
          </View>

          {/* Continue as guest button */}
          <TouchableOpacity onPress={onClose} style={styles.continueGuestButton}>
            <Text style={styles.continueGuestText}>Continue browsing as guest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    lineHeight: 26,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  continueGuestButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  continueGuestText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.gray,
    textDecorationLine: 'underline',
  },
});
