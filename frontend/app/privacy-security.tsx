import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        if (user) setEmail(user.email || '');

        const token = await AsyncStorage.getItem('token');
        if (token) {
          const res = await axios.get(`${API_CONFIG.BASE_URL}/api/merchant/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data?.restaurant_name) setRestaurantName(res.data.restaurant_name);
        }
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Privacy & Security</Text>
            <Text style={styles.headerSub}>Owner account and restaurant data controls</Text>
          </View>
        </View>

        {/* Top Card */}
        <View style={styles.card}>
          {/* Account email */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Account email</Text>
              <Text style={styles.rowValue}>{email || 's@gmail.com'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Restaurant access */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Restaurant access</Text>
              <Text style={styles.rowValue}>
                Owner tools enabled for {restaurantName || 'your restaurant'}
              </Text>
              <Text style={styles.rowDesc}>
                Dashboard, bookings, tables, and menu changes are tied to this account.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Password row */}
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Password and sign in</Text>
              <Text style={styles.rowDesc}>
                Reset your password if you suspect unauthorized access to the restaurant account.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => router.push('/reset-password' as any)}
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Handling Card */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Ionicons name="server-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowValue}>Data handling</Text>
              <Text style={styles.rowDesc}>
                Reservation details, customer reviews, and restaurant profile information are stored to operate your merchant tools and notify you about important account activity.
              </Text>
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={[styles.noteCard, { marginTop: 16 }]}>
          <Text style={styles.noteTitle}>Security note</Text>
          <Text style={styles.noteBody}>
            If the restaurant changes ownership or team access needs to be transferred, update your owner profile and contact support before sharing login credentials.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.gray,
  },
  rowValue: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  rowDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  resetBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },

  noteCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#FEFCF4',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  noteTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 8,
  },
  noteBody: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: Colors.gray,
  },
});
