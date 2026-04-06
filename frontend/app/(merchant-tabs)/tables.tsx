import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_CONFIG } from '@/app/config/apiConfig';
import { useRealtimeTableUpdates } from '@/hooks/useRealtimeTableUpdates';

interface Table {
  id: string;
  table_number: number;
  capacity: number;
  status: string; // 'available' | 'booked' | 'occupied'
  restaurant_id: string;
  customer_name?: string;
  guest_count?: number;
  arrive_time?: string;
}

export default function MerchantTablesScreen() {
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState('');

  // 🔌 Real-time table updates from backend
  const { realtimeTables } = useRealtimeTableUpdates(restaurantId || '', tables);
  
  // Use real-time tables if available, otherwise use local tables
  const displayTables = realtimeTables.length > 0 ? realtimeTables : tables;

  const loadData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!token || !user) return;

      const restRes = await axios.get(`${API_CONFIG.BASE_URL}/api/restaurants`);
      const myRestaurant = restRes.data?.find?.((r: any) => r.merchant_id === user.id);
      if (myRestaurant) {
        setRestaurantId(myRestaurant.id);
        const tableRes = await axios.get(
          `${API_CONFIG.BASE_URL}/api/tables?restaurant_id=${myRestaurant.id}`
        );
        setTables(tableRes.data || []);
      }
    } catch {
      // empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const updateTableStatus = async (table: Table, newStatus: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`${API_CONFIG.BASE_URL}/api/tables/${table.id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, status: newStatus } : t));
    } catch {
      Alert.alert('Error', 'Failed to update table status');
    }
  };

  const handleDelete = (table: Table) => {
    Alert.alert('Delete Table', `Delete Table ${table.table_number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            await axios.delete(`${API_CONFIG.BASE_URL}/api/tables/${table.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            
            // Remove from UI immediately
            setTables(prev => prev.filter(t => t.id !== table.id));
            
            // Show success
            Alert.alert('Deleted', `Table ${table.table_number} has been removed`);
          } catch (err: any) {
            console.error('Error deleting table:', err.response?.data || err.message);
            Alert.alert('Error', err.response?.data?.error || 'Failed to delete table');
          }
        },
      },
    ]);
  };

  const handleAddTable = async () => {
    if (!newTableNumber || !newCapacity || !restaurantId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate table number
    const tableNum = parseInt(newTableNumber);
    if (isNaN(tableNum) || tableNum <= 0) {
      Alert.alert('Invalid Table Number', 'Table number must be a positive number (e.g., 1, 2, 3)');
      return;
    }

    // Validate capacity
    const cap = parseInt(newCapacity);
    if (isNaN(cap) || cap <= 0) {
      Alert.alert('Invalid Capacity', 'Capacity must be a positive number (e.g., 2, 4, 6)');
      return;
    }

    // Check if table number already exists locally
    const tableExists = tables.some(t => t.table_number === tableNum);
    if (tableExists) {
      Alert.alert('Duplicate Table Number', `Table ${tableNum} already exists. Each table must have a unique number.`);
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(`${API_CONFIG.BASE_URL}/api/tables`,
        { restaurant_id: restaurantId, table_number: tableNum, capacity: cap },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data) {
        const created = Array.isArray(res.data) ? res.data[0] : res.data;
        
        // Add to local state immediately
        setTables(prev => [...prev, created]);
        
        // Reset form
        setShowAddModal(false);
        setNewTableNumber('');
        setNewCapacity('');
        
        // Show success message
        Alert.alert('Success', `Table ${created.table_number} (${created.capacity} seats) has been added and is now live for customers!`);
        
        // Refresh from server to ensure sync
        setTimeout(() => loadData(), 500);
      }
    } catch (err: any) {
      console.log('📌 [handleAddTable] Error caught:');
      console.log('   Status:', err.response?.status);
      console.log('   Data:', err.response?.data);
      
      // Handle 409 Conflict - Duplicate Table
      if (err.response?.status === 409) {
        console.log('   → Duplicate table detected');
        Alert.alert(
          'Table Number Already Exists',
          `Table ${newTableNumber} already exists for this restaurant. Please use a different table number (e.g., ${tableNum + 1})`,
          [{ text: 'OK', onPress: () => console.log('Alert dismissed') }]
        );
        return;
      }
      
      // Handle 400 Bad Request
      if (err.response?.status === 400) {
        console.log('   → Invalid input');
        Alert.alert('Invalid Input', err.response.data?.error || 'Please check your inputs');
        return;
      }
      
      // Handle 401 Unauthorized
      if (err.response?.status === 401) {
        console.log('   → Not authorized');
        Alert.alert('Not Authorized', 'Please log in again');
        return;
      }
      
      // Handle 403 Forbidden
      if (err.response?.status === 403) {
        console.log('   → Forbidden');
        Alert.alert('Permission Denied', err.response.data?.error || 'You cannot manage tables for this restaurant');
        return;
      }
      
      // Handle other errors
      if (err.response?.data?.error) {
        console.log('   → API error:', err.response.data.error);
        Alert.alert('Error', err.response.data.error);
        return;
      }
      
      if (err.message) {
        console.log('   → Exception:', err.message);
        Alert.alert('Error', err.message);
        return;
      }
      
      Alert.alert('Error', 'Failed to add table. Please try again.');
    }
  };

  const availableCount = displayTables.filter(t => t.status === 'available').length;
  const bookedCount = displayTables.filter(t => t.status === 'booked').length;
  const guestTotal = displayTables.reduce((sum, t) => sum + (t.guest_count || 0), 0);

  const getStatusStyle = (status: string) => {
    if (status === 'booked') return { label: 'Booked', color: '#E88B00', bg: '#FFF3E0', icon: 'time-outline' as const };
    if (status === 'occupied') return { label: 'Occupied', color: '#E74C3C', bg: '#FDEDEC', icon: 'close-circle-outline' as const };
    return { label: 'Available', color: '#2BA15C', bg: '#E8F8EF', icon: 'checkmark-circle-outline' as const };
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tables Management</Text>
          <Text style={styles.subtitle}>Manage seating and availability</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{availableCount}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{bookedCount}</Text>
            <Text style={styles.statLabel}>Booked</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{guestTotal}</Text>
            <Text style={styles.statLabel}>Guests</Text>
          </View>
        </View>

        {/* All Tables Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Tables</Text>
          <TouchableOpacity style={styles.addTableBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addTableText}>Add New Table</Text>
          </TouchableOpacity>
        </View>

        {/* Table Cards */}
        {displayTables.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cafe-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>No tables yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add New Table" to get started</Text>
          </View>
        ) : (
          displayTables.map(table => {
            const st = getStatusStyle(table.status);
            return (
              <View key={table.id} style={styles.tableCard}>
                <View style={styles.tableCardTop}>
                  <View style={styles.tableNameRow}>
                    <Text style={styles.tableName}>Table {table.table_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Ionicons name={st.icon} size={14} color={st.color} />
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(table)}>
                    <View style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                    </View>
                  </TouchableOpacity>
                </View>

                {table.status === 'booked' && (
                  <View style={styles.bookingDetails}>
                    {table.customer_name ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name: {table.customer_name}</Text>
                        <View style={styles.guestRow}>
                          <Ionicons name="people-outline" size={14} color={Colors.gray} />
                          <Text style={styles.detailValue}>{table.guest_count || 0} guests</Text>
                        </View>
                      </View>
                    ) : null}
                    {table.arrive_time ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Arrive Time:</Text>
                        <Text style={styles.detailValue}>{table.arrive_time}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <View style={styles.tableBottom}>
                  <Text style={styles.seatCount}>{table.capacity} seats</Text>
                  <View style={styles.tableActions}>
                    {table.status !== 'available' && (
                      <TouchableOpacity
                        style={styles.tableActionBtn}
                        onPress={() => updateTableStatus(table, 'available')}
                      >
                        <Text style={styles.tableActionText}>Mark as Available</Text>
                      </TouchableOpacity>
                    )}
                    {table.status !== 'occupied' && (
                      <TouchableOpacity
                        style={styles.tableActionBtnPrimary}
                        onPress={() => updateTableStatus(table, 'occupied')}
                      >
                        <Text style={styles.tableActionTextPrimary}>Mark as Occupied</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Add Table Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Table</Text>
            <Text style={styles.inputLabel}>Table Number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 1"
              placeholderTextColor={Colors.gray}
              keyboardType="number-pad"
              value={newTableNumber}
              onChangeText={setNewTableNumber}
            />
            <Text style={styles.inputLabel}>Seats (Capacity)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 4"
              placeholderTextColor={Colors.gray}
              keyboardType="number-pad"
              value={newCapacity}
              onChangeText={setNewCapacity}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleAddTable}>
                <Text style={styles.modalSubmitText}>Add Table</Text>
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

  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 24, color: Colors.text },
  statLabel: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, color: Colors.text },
  addTableBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addTableText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.primary },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 16, color: Colors.text, marginTop: 12 },
  emptySubtext: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: Colors.gray, marginTop: 4 },

  tableCard: {
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  tableCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tableNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableName: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 18, color: Colors.text },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 12 },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FDE8E8', alignItems: 'center', justifyContent: 'center',
  },

  bookingDetails: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.border },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  detailLabel: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 14, color: Colors.text },
  detailValue: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: Colors.gray },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  tableBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  seatCount: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: Colors.gray },
  tableActions: { flexDirection: 'row', gap: 8 },
  tableActionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  tableActionText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, color: Colors.text },
  tableActionBtnPrimary: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  tableActionTextPrimary: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, color: Colors.white },

  /* Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    width: '85%', backgroundColor: Colors.white, borderRadius: 20, padding: 24,
  },
  modalTitle: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: Colors.text, marginBottom: 20 },
  inputLabel: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 14, color: Colors.text, marginBottom: 6 },
  modalInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, marginBottom: 16,
    fontFamily: 'PlusJakartaSans-Regular', fontSize: 14, color: Colors.text,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 14, color: Colors.text },
  modalSubmit: {
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center',
  },
  modalSubmitText: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14, color: Colors.white },
});
