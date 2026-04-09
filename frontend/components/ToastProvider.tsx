import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_DURATION = 2800;

/* ── Types ── */

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ConfirmButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (title: string, message: string, buttons?: ConfirmButton[]) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  confirm: () => {},
});

export const useAppToast = () => useContext(ToastContext);

/* ── Config per type ── */

const TOAST_CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; bg: string; accent: string }> = {
  success: { icon: 'checkmark-circle', bg: '#E8F5E9', accent: '#2E7D32' },
  error: { icon: 'alert-circle', bg: '#FFEBEE', accent: '#C62828' },
  warning: { icon: 'warning', bg: '#FFF8E1', accent: '#E65100' },
  info: { icon: 'information-circle', bg: '#FDF6E0', accent: Colors.text },
};

/* ── Provider ── */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  /* Toast state */
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<ToastType>('info');
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Confirm state */
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmButtons, setConfirmButtons] = useState<ConfirmButton[]>([]);

  /* Show toast */
  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setToastMsg(message);
      setToastType(type);
      setToastVisible(true);

      slideAnim.setValue(-120);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 250,
          useNativeDriver: true,
        }).start(() => setToastVisible(false));
      }, TOAST_DURATION);
    },
    [slideAnim],
  );

  /* Show confirm dialog */
  const confirm = useCallback(
    (title: string, message: string, buttons?: ConfirmButton[]) => {
      setConfirmTitle(title);
      setConfirmMsg(message);
      setConfirmButtons(
        buttons || [{ text: 'OK', style: 'default' }],
      );
      setConfirmVisible(true);
    },
    [],
  );

  const handleConfirmButton = (btn: ConfirmButton) => {
    setConfirmVisible(false);
    // Small delay so modal closes smoothly before callback runs
    setTimeout(() => btn.onPress?.(), 150);
  };

  const cfg = TOAST_CONFIG[toastType];

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast banner ── */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            { backgroundColor: cfg.bg, borderLeftColor: cfg.accent, transform: [{ translateY: slideAnim }] },
          ]}
          pointerEvents="box-none"
        >
          <Ionicons name={cfg.icon} size={22} color={cfg.accent} />
          <Text style={[styles.toastText, { color: cfg.accent }]} numberOfLines={3}>
            {toastMsg}
          </Text>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              Animated.timing(slideAnim, {
                toValue: -120,
                duration: 200,
                useNativeDriver: true,
              }).start(() => setToastVisible(false));
            }}
          >
            <Ionicons name="close" size={18} color={cfg.accent} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Confirm dialog ── */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>{confirmTitle}</Text>
            {!!confirmMsg && <Text style={styles.dialogMsg}>{confirmMsg}</Text>}

            <View style={styles.dialogBtnRow}>
              {confirmButtons.map((btn, i) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dialogBtn,
                      confirmButtons.length === 1 && { flex: 1 },
                      isCancel && styles.dialogBtnCancel,
                      isDestructive && styles.dialogBtnDestructive,
                      !isCancel && !isDestructive && styles.dialogBtnDefault,
                    ]}
                    onPress={() => handleConfirmButton(btn)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dialogBtnText,
                        isCancel && styles.dialogBtnTextCancel,
                        isDestructive && styles.dialogBtnTextDestructive,
                        !isCancel && !isDestructive && styles.dialogBtnTextDefault,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  /* Toast */
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 36,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99999,
  },
  toastText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },

  /* Confirm dialog */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  dialogMsg: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 21,
    marginBottom: 24,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  dialogBtnCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dialogBtnDestructive: {
    backgroundColor: '#FF2424',
  },
  dialogBtnDefault: {
    backgroundColor: Colors.primary,
  },
  dialogBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
  },
  dialogBtnTextCancel: {
    color: Colors.text,
  },
  dialogBtnTextDestructive: {
    color: '#fff',
  },
  dialogBtnTextDefault: {
    color: Colors.text,
  },
});
