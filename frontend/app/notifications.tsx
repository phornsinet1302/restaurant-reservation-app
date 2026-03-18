import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

/* ── Data ── */

type Notification = {
  id: string;
  type: 'confirmed' | 'modified';
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'confirmed',
    title: 'Booking Confirmed',
    body: 'Reservation RRA-3FX8E at Romeo Lane on 2026-03-09 at 6:30pm is confirmed.',
    time: '2m ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'modified',
    title: 'Booking Modified',
    body: 'Your reservation at Romeo Lane was marked as modified. Please create a new reservation time.',
    time: '2m ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'confirmed',
    title: 'Booking Confirmed',
    body: 'Reservation RRA-T8E4T at Romeo Lane on 2026-03-10 at 1:30pm is confirmed.',
    time: '3m ago',
    read: false,
  },
  {
    id: 'n4',
    type: 'confirmed',
    title: 'Booking Confirmed',
    body: 'Reservation RRA-ZZV3S at Sakura Sushi Bar on 2026-03-09 at 2:30pm is confirmed.',
    time: '10m ago',
    read: false,
  },
];

/* ── Component ── */

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  };

  const getIcon = (type: Notification['type']) => {
    if (type === 'confirmed') {
      return (
        <View style={[styles.iconCircle, styles.iconConfirmed]}>
          <Ionicons name="checkmark" size={20} color={Colors.white} />
        </View>
      );
    }
    return (
      <View style={[styles.iconCircle, styles.iconModified]}>
        <Text style={styles.iconEmoji}>✏️</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>{unreadCount} unread</Text>
        </View>
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[
              styles.card,
              !n.read && styles.cardUnread,
            ]}
            activeOpacity={0.8}
            onPress={() => toggleRead(n.id)}
          >
            <View style={styles.cardRow}>
              {getIcon(n.type)}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardBody}>{n.body}</Text>
                <Text style={styles.cardTime}>{n.time}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
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
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  markAllText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },

  /* List */
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },

  /* Card */
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    padding: 16,
  },
  cardUnread: {
    backgroundColor: '#FDF6E0',
    borderColor: '#E5DBBD',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  /* Icon */
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  iconConfirmed: {
    backgroundColor: Colors.success,
  },
  iconModified: {
    backgroundColor: '#FDF6E0',
  },
  iconEmoji: {
    fontSize: 20,
  },

  /* Card content */
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
    marginBottom: 6,
  },
  cardTime: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
  },

  /* Unread dot */
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
});
