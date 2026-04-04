import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useFocusEffect } from '@react-navigation/native';
import { useReservationSocket } from '@/hooks/useReservationSocket';
import { useNotifications } from '@/hooks/useNotifications';

type TabKey = 'upcoming' | 'completed' | 'cancelled';

interface Reservation {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  table_id: string;
  table_number?: number;
  status: string;
  notes?: string;
  reference_code?: string;
  customer_name?: string;
  customer_email?: string;
  restaurant_name?: string;
  special_request?: string;
  tables?: {
    table_number: string;
  };
}

export default function MerchantBookingsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [restaurantId, setRestaurantId] = useState<string | undefined>(undefined);

  // Modal states for actions
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'confirm' | 'reject' | 'cancel' | 'arrived' | 'completed'>('reject');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reason, setReason] = useState('');
  const [actioning, setActioning] = useState(false);

  // Initialize notifications hook for real-time updates
  const { notifications, unreadCount } = useNotifications();

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }

      console.log('🔄 Loading bookings...');
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/reservations/merchant/pending-reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('✅ Bookings loaded:', res.data);
      setReservations(res.data || []);

      // Extract restaurant ID from first reservation (all reservations are from same restaurant)
      if (res.data && res.data.length > 0) {
        const restId = res.data[0].restaurant_id;
        setRestaurantId(restId);
        console.log('🏪 Restaurant ID set:', restId);
      }

      // Restaurant name is already shown in card - no need to fetch separately
      // The booking cards display the restaurant name from state
    } catch (error: any) {
      console.error('❌ Error loading bookings:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      Alert.alert('Error', 'Failed to load bookings. Please check the backend server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Listen for incoming notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotif = notifications[0];
      
      // Show toast for booking confirmations/rejections
      if (latestNotif.type === 'booking_confirmed') {
        ToastAndroid.show(`✅ ${latestNotif.title}`, ToastAndroid.LONG);
        console.log('🔔 Toast shown for booking confirmation');
        loadData(); // Refresh bookings list
      } else if (latestNotif.type === 'booking_rejected') {
        ToastAndroid.show(`❌ ${latestNotif.title}`, ToastAndroid.LONG);
        console.log('🔔 Toast shown for booking rejection');
        loadData(); // Refresh bookings list
      }
    }
  }, [notifications, loadData]);

  // Handle real-time reservation updates from WebSocket (must be after loadData)
  const handleReservationUpdate = useCallback((update: any) => {
    console.log('📢 Reservation update received:', update);
    
    // Show a notification
    let message = '';
    if (update.action === 'confirmed') message = '✅ Booking confirmed';
    else if (update.action === 'rejected') message = '❌ Booking rejected';
    else if (update.action === 'cancelled' || update.action === 'cancelled_by_customer') message = '🚫 Booking cancelled';
    else if (update.action === 'arrived') message = '🚗 Guest arrived';
    else if (update.action === 'completed') message = '✅ Booking completed';
    else if (update.action === 'modified') message = '✏️ Booking modified by customer';
    
    if (message) {
      console.log('📢', message);
    }
    
    // Refresh the bookings list to show updated status (slight delay to let backend update)
    setTimeout(() => {
      loadData();
    }, 500);
  }, [loadData]);

  // WebSocket hook
  useReservationSocket(restaurantId, handleReservationUpdate);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleAction = (type: 'confirm' | 'reject' | 'cancel' | 'arrived' | 'completed', reservation: Reservation) => {
    setActionType(type);
    setSelectedReservation(reservation);
    setReason('');
    setModalVisible(true);
  };

  const confirmAction = async () => {
    if (!selectedReservation) return;
    
    if ((actionType === 'reject' || actionType === 'cancel') && !reason.trim()) {
      Alert.alert('Error', `Please provide a reason for ${actionType}ing this booking`);
      return;
    }

    setActioning(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'No auth token found');
        return;
      }

      let endpoint = '';
      let payload: any = {};
      let newStatus = '';

      if (actionType === 'confirm') {
        endpoint = `${API_CONFIG.BASE_URL}/api/reservations/merchant/${selectedReservation.id}/confirm`;
        newStatus = 'confirmed';
      } else if (actionType === 'reject') {
        endpoint = `${API_CONFIG.BASE_URL}/api/reservations/merchant/${selectedReservation.id}/reject`;
        payload = { reason: reason.trim() };
        newStatus = 'rejected';
      } else if (actionType === 'cancel') {
        endpoint = `${API_CONFIG.BASE_URL}/api/reservations/merchant/${selectedReservation.id}/cancel`;
        payload = { reason: reason.trim() };
        newStatus = 'cancelled';
      } else if (actionType === 'arrived') {
        endpoint = `${API_CONFIG.BASE_URL}/api/reservations/merchant/${selectedReservation.id}/mark-arrived`;
        newStatus = 'arrived';
      } else if (actionType === 'completed') {
        endpoint = `${API_CONFIG.BASE_URL}/api/reservations/merchant/${selectedReservation.id}/mark-completed`;
        newStatus = 'completed';
      }

      const response = await axios.patch(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      console.log(`✅ ${actionType} successful:`, response.data);
      
      // Update local state immediately for instant UI feedback
      setReservations(prevReservations =>
        prevReservations.map(r => 
          r.id === selectedReservation.id 
            ? { ...r, status: newStatus as any }
            : r
        )
      );
      
      Alert.alert('Success', `Booking ${actionType}ed successfully`);
      setModalVisible(false);
      
      // Refresh data in background after a short delay
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error: any) {
      console.error(`❌ Error ${actionType}ing booking:`);
      console.error('  Error message:', error.message);
      console.error('  Status:', error.response?.status);
      console.error('  Error data:', error.response?.data);
      Alert.alert('Error', error.response?.data?.error || `Failed to ${actionType} booking`);
    } finally {
      setActioning(false);
    }
  };

  const now = new Date();
  const upcoming = reservations.filter(r => {
    const resDate = new Date(`${r.reservation_date}T${r.reservation_time || '00:00'}`);
    return (r.status === 'pending' || r.status === 'confirmed' || r.status === 'arrived') && resDate >= now;
  });
  const completed = reservations.filter(r => r.status === 'completed');
  const cancelled = reservations.filter(r => r.status === 'cancelled' || r.status === 'rejected');

  const tabData: Record<TabKey, { items: Reservation[]; count: number }> = {
    upcoming: { items: upcoming, count: upcoming.length },
    completed: { items: completed, count: completed.length },
    cancelled: { items: cancelled, count: cancelled.length },
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return date;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return { label: 'Completed', color: '#2BA15C', bg: '#E8F8EF' };
    if (status === 'cancelled' || status === 'rejected') return { label: 'Cancelled', color: '#E74C3C', bg: '#FDEDEC' };
    if (status === 'confirmed') return { label: 'Confirmed', color: '#2BA15C', bg: '#E8F8EF' };
    if (status === 'arrived') return { label: 'Arrived', color: '#2196F3', bg: '#E3F2FD' };
    return { label: 'Pending', color: '#E88B00', bg: '#FFF3E0' };
  };

  const generateRef = (id: string) => {
    return 'RRA-' + id.slice(0, 5).toUpperCase();
  };

  const renderReservationCard = (item: Reservation) => {
    const badge = getStatusBadge(item.status);
    const ref = item.reference_code || generateRef(item.id);
    const isPending = item.status === 'pending';
    const isConfirmed = item.status === 'confirmed';
    const isArrived = item.status === 'arrived';

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardRestaurant}>{restaurantName}</Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.cardRef}>Ref: {ref}</Text>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={Colors.gray} />
            <Text style={styles.detailText}>{formatDate(item.reservation_date)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={14} color={Colors.gray} />
            <Text style={styles.detailText}>{item.party_size} guests</Text>
          </View>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailText}>{formatTime(item.reservation_time)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailText}>Table {item.table_number || item.tables?.table_number || '—'}</Text>
          </View>
        </View>

        {item.customer_name || item.customer_email ? (
          <Text style={styles.bookedBy}>
            Booked by: {item.customer_name || ''} {item.customer_email ? `(${item.customer_email})` : ''}
          </Text>
        ) : null}

        {item.notes ? (
          <Text style={styles.note}>Note: {item.notes}</Text>
        ) : null}

        {item.special_request ? (
          <Text style={styles.note}>Special Request: {item.special_request}</Text>
        ) : null}

        {/* Action Buttons for Pending Bookings */}
        {isPending && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={() => handleAction('confirm', item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.actionBtnText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleAction('reject', item)}
            >
              <Ionicons name="close-circle" size={16} color="white" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => handleAction('cancel', item)}
            >
              <Ionicons name="trash" size={16} color="white" />
              <Text style={styles.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons for Confirmed Bookings */}
        {isConfirmed && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.arrivedBtn]}
              onPress={() => handleAction('arrived', item)}
            >
              <Ionicons name="person-add" size={16} color="white" />
              <Text style={styles.actionBtnText}>Mark Arrived</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons for Arrived Bookings */}
        {isArrived && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.completedBtn]}
              onPress={() => handleAction('completed', item)}
            >
              <Ionicons name="checkmark-done" size={16} color="white" />
              <Text style={styles.actionBtnText}>Complete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentItems = tabData[activeTab].items;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.subtitle}>Manage your reservations</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['upcoming', 'completed', 'cancelled'] as TabKey[]).map(tab => {
          const isActive = activeTab === tab;
          const count = tabData[tab].count;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {currentItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
            <Text style={styles.emptySubtitle}>Your {activeTab} bookings will appear here</Text>
          </View>
        ) : (
          currentItems.map(renderReservationCard)
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'confirm' ? 'Confirm Booking' :
                 actionType === 'reject' ? 'Reject Booking' :
                 actionType === 'cancel' ? 'Cancel Booking' :
                 actionType === 'arrived' ? 'Customer Arrived' :
                 'Complete Booking'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedReservation && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Customer</Text>
                    <Text style={styles.modalValue}>{selectedReservation.customer_name}</Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Email</Text>
                    <Text style={styles.modalValue}>{selectedReservation.customer_email}</Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Date & Time</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedReservation.reservation_date)} at {formatTime(selectedReservation.reservation_time)}
                    </Text>
                  </View>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Party Size</Text>
                    <Text style={styles.modalValue}>{selectedReservation.party_size} guests</Text>
                  </View>

                  {(actionType === 'reject' || actionType === 'cancel') && (
                    <View style={styles.reasonSection}>
                      <Text style={styles.modalLabel}>
                        {actionType === 'reject' ? 'Rejection Reason' : 'Cancellation Reason'} *
                      </Text>
                      <TextInput
                        style={styles.reasonInput}
                        placeholder={`Enter ${actionType} reason...`}
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  actionType === 'confirm' ? styles.confirmButton :
                  actionType === 'reject' ? styles.rejectButton :
                  actionType === 'cancel' ? styles.cancelButton :
                  actionType === 'arrived' ? styles.arrivedButton :
                  styles.completedButton
                ]}
                onPress={confirmAction}
                disabled={actioning}
              >
                {actioning ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionModalText}>
                    {actionType === 'confirm' ? 'Confirm' :
                     actionType === 'reject' ? 'Reject' :
                     actionType === 'cancel' ? 'Cancel' :
                     actionType === 'arrived' ? 'Mark Arrived' :
                     'Complete Booking'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 26, color: Colors.text },
  subtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 16,
    backgroundColor: Colors.white, borderRadius: 28, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.text },
  tabText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, color: Colors.gray },
  tabTextActive: { fontFamily: 'PlusJakartaSans-SemiBold', color: Colors.white },

  scrollContent: { paddingBottom: 30 },

  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.text, marginTop: 16 },
  emptySubtitle: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },

  card: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardRestaurant: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 16, color: Colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 12 },
  cardRef: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray },

  cardDetails: {
    flexDirection: 'row', gap: 24, marginBottom: 4,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray },

  bookedBy: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.text, marginTop: 10,
  },
  note: {
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.primary,
    fontStyle: 'italic', marginTop: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  confirmBtn: {
    backgroundColor: '#4CAF50',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
  },
  cancelBtn: {
    backgroundColor: '#9E9E9E',
  },
  actionBtnText: {
    color: 'white',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.text,
  },
  reasonSection: {
    marginBottom: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    height: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: Colors.border,
  },
  closeButtonText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: Colors.text,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#9E9E9E',
  },
  arrivedBtn: {
    backgroundColor: '#2196F3',
  },
  completedBtn: {
    backgroundColor: '#2BA15C',
  },
  arrivedButton: {
    backgroundColor: '#2196F3',
  },
  completedButton: {
    backgroundColor: '#2BA15C',
  },
  actionModalText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: 'white',
  },
});
