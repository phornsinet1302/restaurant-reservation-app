import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAppToast } from '@/components/ToastProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DebugTokenScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useAppToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadTokenInfo();
  }, []);

  const loadTokenInfo = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      setToken(storedToken);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Error loading token:', err);
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      toast('Token and user data cleared', 'success');
      loadTokenInfo();
    } catch (err) {
      toast('Failed to clear storage', 'error');
    }
  };

  const copyToken = () => {
    if (token) {
      // Can't actually copy to clipboard in React Native easily, but show it
      toast(token.substring(0, 50) + '...', 'info');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 12, 60) }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Debug Token Info</Text>
      </View>

      {/* Token Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Auth Token</Text>
        {token ? (
          <>
            <View style={styles.statusGood}>
              <Ionicons name="checkmark-circle" size={24} color="#2BA15C" />
              <Text style={styles.statusText}>Token Found ✓</Text>
            </View>
            <Text style={styles.tokenLength}>Length: {token.length} characters</Text>
            <Text style={styles.tokenPreview}>Start: {token.substring(0, 30)}...</Text>
            <TouchableOpacity style={styles.btn} onPress={copyToken}>
              <Text style={styles.btnText}>Show Full Token</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.statusBad}>
              <Ionicons name="close-circle" size={24} color="#E74C3C" />
              <Text style={styles.statusText}>No Token Found ❌</Text>
            </View>
            <Text style={styles.explanation}>
              You need to log in first to get a token. Click the button below to go to login.
            </Text>
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: Colors.primary }]} 
              onPress={() => router.push('/login')}
            >
              <Text style={styles.btnText}>Go to Login</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* User Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>User Info</Text>
        {user ? (
          <>
            <Text style={styles.infoLine}>
              <Text style={styles.label}>ID:</Text> {user.id?.substring(0, 20)}...
            </Text>
            <Text style={styles.infoLine}>
              <Text style={styles.label}>Email:</Text> {user.email || 'Not available'}
            </Text>
            <Text style={styles.infoLine}>
              <Text style={styles.label}>Role:</Text> {user.role || 'Not available'}
            </Text>
          </>
        ) : (
          <Text style={styles.explanation}>No user data stored</Text>
        )}
      </View>

      {/* Storage Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Storage Actions</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={clearStorage}>
          <Ionicons name="trash-outline" size={18} color="#E74C3C" />
          <Text style={styles.dangerBtnText}>Clear All Storage</Text>
        </TouchableOpacity>
      </View>

      {/* Debugging Tips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Debugging Tips</Text>
        <Text style={styles.tip}>
          1️⃣ If "No Token Found": Sign up/login first, then return here
        </Text>
        <Text style={styles.tip}>
          2️⃣ Check the Expo console (Ctrl+Shift+V) for detailed logs
        </Text>
        <Text style={styles.tip}>
          3️⃣ Try booking again and check console for "=== BOOKING REQUEST ===" logs
        </Text>
        <Text style={styles.tip}>
          4️⃣ If still failing, note the error code (401, 400, 500) and backend logs
        </Text>
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
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },

  statusGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusBad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },

  tokenLength: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 8,
  },
  tokenPreview: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    fontStyle: 'italic',
  },

  infoLine: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  label: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: Colors.primary,
  },

  explanation: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    lineHeight: 20,
  },

  btn: {
    backgroundColor: Colors.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: '#FFF',
  },

  dangerBtn: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#E74C3C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerBtnText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: '#E74C3C',
  },

  tip: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 8,
    lineHeight: 18,
  },
});
