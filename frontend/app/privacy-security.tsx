import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function PrivacySecurityScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <Text style={styles.headerSub}>
            Essentials for your account and reservation data
          </Text>
        </View>
      </View>

      {/* Card */}
      <View style={styles.card}>
        {/* Account email */}
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Account email</Text>
            <Text style={styles.rowValue}>google.social@rra.app</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Password row */}
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Password and sign in</Text>
            <Text style={styles.rowDesc}>
              Reset your password if you think your account is compromised.
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
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
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

  /* Card */
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
  rowContent: {
    flex: 1,
  },
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
});
