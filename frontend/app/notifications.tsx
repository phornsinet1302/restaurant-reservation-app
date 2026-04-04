import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/hooks/useNotifications';

/* ── Component ── */

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    loading,
    unreadCount,
    markAllAsRead,
    markAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return (
          <View style={[styles.iconCircle, styles.iconConfirmed]}>
            <Ionicons name="checkmark" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_rejected':
        return (
          <View style={[styles.iconCircle, styles.iconRejected]}>
            <Ionicons name="close" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_modified':
        return (
          <View style={[styles.iconCircle, styles.iconModified]}>
            <Ionicons name="pencil" size={20} color={Colors.white} />
          </View>
        );
      case 'booking_cancelled':
        return (
          <View style={[styles.iconCircle, styles.iconCancelled]}>
            <Ionicons name="ban" size={20} color={Colors.white} />
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, styles.iconDefault]}>
            <Ionicons name="notifications" size={20} color={Colors.white} />
          </View>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
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
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={Colors.gray} />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubText}>You'll get notifications about your bookings here</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[
                styles.card,
                !n.is_read && styles.cardUnread,
              ]}
              activeOpacity={0.8}
              onPress={() => markAsRead(n.id)}
            >
              <View style={styles.cardRow}>
                {getIcon(n.type)}
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={2}>{n.message}</Text>
                  <Text style={styles.cardTime}>{formatTime(n.created_at)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteNotification(n.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.gray} />
                </TouchableOpacity>
              </View>
              {!n.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 12,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
    textAlign: 'center',
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
    backgroundColor: '#10b981',
  },
  iconRejected: {
    backgroundColor: '#ef4444',
  },
  iconModified: {
    backgroundColor: '#f59e0b',
  },
  iconCancelled: {
    backgroundColor: '#8b5cf6',
  },
  iconDefault: {
    backgroundColor: Colors.primary,
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

  /* Delete button */
  deleteBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  /* Unread dot */
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 12,
    right: 12,
  },
});
