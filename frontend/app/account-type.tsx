import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountTypeScreen() {
  const handleSelectRole = async (role: 'customer' | 'restaurant') => {
    try {
      await AsyncStorage.setItem('selectedRole', role);
      if (role === 'customer') {
        router.push('/signup');
      } else {
        router.push('/restaurant-signup');
      }
    } catch (error) {
      console.error('Error storing role:', error);
    }
  };
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>

      {/* Heading */}
      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.subtitle}>
        Create a customer account here. Restaurant owner registration starts from restaurant access.
      </Text>

      {/* Customer account card */}
      <TouchableOpacity
        style={styles.accountCard}
        activeOpacity={0.7}
        onPress={() => handleSelectRole('customer')}
      >
        <View style={styles.accountIconCircle}>
          <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
        </View>
        <View style={styles.accountTextContainer}>
          <Text style={styles.accountTitle}>Customer account</Text>
          <Text style={styles.accountDescription}>
            Book tables, save favorites, and manage your reservation history.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
      </TouchableOpacity>

      {/* Restaurant owner info box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Registering as a Cambodia restaurant owner? Use restaurant access and select Create owner account to begin onboarding.
        </Text>
        <TouchableOpacity onPress={() => handleSelectRole('restaurant')}>
          <Text style={styles.infoLink}>Open restaurant access</Text>
        </TouchableOpacity>
      </View>

      {/* Spacer to push footer to bottom */}
      <View style={styles.spacer} />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.footerLink}>Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
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
  heading: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 26,
    lineHeight: 34,
    color: Colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray,
    marginBottom: 28,
  },

  /* Customer account card */
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  accountIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accountTextContainer: {
    flex: 1,
  },
  accountTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  accountDescription: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: Colors.gray,
  },

  /* Info box */
  infoBox: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: `${Colors.primary}08`,
    padding: 18,
  },
  infoText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
    marginBottom: 10,
  },
  infoLink: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },

  /* Footer */
  spacer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
  },
  footerLink: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
});
