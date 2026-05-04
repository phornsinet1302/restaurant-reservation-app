import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TOAST_DURATION = 2500;

export function useToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg = 'This feature is under development') => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), TOAST_DURATION);
  }, []);

  const Toast = useCallback(() => {
    if (!visible) return null;
    return (
      <View style={styles.toast}>
        <Ionicons name="construct-outline" size={18} color="#fff" />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    );
  }, [visible, message]);

  return { showToast, Toast };
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    backgroundColor: '#2F2518',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
});
