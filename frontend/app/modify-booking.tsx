import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';

const API_URL = API_CONFIG.BASE_URL;

/* ── Helpers ── */

const TIME_SLOTS = [
  '12:30pm',
  '1:30pm',
  '2:00pm',
  '4:00pm',
  '4:30pm',
  '6:30pm',
];

function getUpcomingDates(fromDate: Date, count: number) {
  const dates: Date[] = [];
  const d = new Date(fromDate);
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < count; i++) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDateHeader(d: Date) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function suggestTable(guests: number) {
  if (guests <= 2) return { table: 5, seats: 2 };
  if (guests <= 4) return { table: 12, seats: 4 };
  if (guests <= 6) return { table: 8, seats: 6 };
  return { table: 3, seats: 8 };
}

/* ── Component ── */

export default function ModifyBookingScreen() {
  const params = useLocalSearchParams<{
    id: string;
    restaurantId: string;
    name: string;
    address: string;
  }>();
  const router = useRouter();

  /* State */
  const baseDate = new Date();
  const quickDates = useMemo(() => getUpcomingDates(new Date(), 4), []);

  const [selectedDate, setSelectedDate] = useState(baseDate);
  const [selectedTime, setSelectedTime] = useState('7:30pm');
  const [guests, setGuests] = useState(2);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reservationId = params.id?.trim() || '';
  const restaurantId = params.restaurantId?.trim() || '';
  const restaurantName = params.name || 'Restaurant';

  // Fetch user's name and email from AsyncStorage
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Try to get from stored user object first
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          setBookingName(user.user_metadata?.full_name || user.full_name || '');
          setBookingEmail(user.email || '');
          return;
        }

        // Otherwise fetch from token (decode JWT if available)
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Decode JWT to get email from claims
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const decoded = JSON.parse(
                Buffer.from(parts[1], 'base64').toString('utf-8')
              );
              setBookingEmail(decoded.email || '');
            }
          } catch (e) {
            console.log('Could not decode JWT:', e);
          }
        }
      } catch (err) {
        console.log('Error fetching user info:', err);
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch available tables for restaurant
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('📋 Fetching tables for restaurant:', restaurantId);
        
        if (!restaurantId) {
          console.warn('⚠️ No restaurantId provided');
          // Use mock tables if no restaurant ID
          const mockTables = [
            { id: 'table-1', table_number: 1, capacity: 2, status: 'available' },
            { id: 'table-2', table_number: 2, capacity: 4, status: 'available' },
            { id: 'table-3', table_number: 3, capacity: 6, status: 'available' },
            { id: 'table-4', table_number: 4, capacity: 2, status: 'available' },
            { id: 'table-5', table_number: 5, capacity: 4, status: 'available' },
          ];
          setTables(mockTables);
          setSelectedTableId(mockTables[0].id);
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${API_URL}/api/tables?restaurant_id=${restaurantId}`
        );
        
        console.log('📊 Tables API response:', response.data);
        
        const allTables = response.data || [];
        console.log(`   Total tables from API: ${allTables.length}`);
        
        // Filter only available tables for customers
        const availableTables = allTables.filter((t: any) => t.status === 'available');
        console.log(`   Available tables: ${availableTables.length}`);
        
        if (availableTables.length === 0) {
          if (allTables.length === 0) {
            console.warn('⚠️ No tables found for this restaurant');
            // Use mock tables if no tables found in database
            const mockTables = [
              { id: 'table-1', table_number: 1, capacity: 2, status: 'available' },
              { id: 'table-2', table_number: 2, capacity: 4, status: 'available' },
              { id: 'table-3', table_number: 3, capacity: 6, status: 'available' },
              { id: 'table-4', table_number: 4, capacity: 2, status: 'available' },
              { id: 'table-5', table_number: 5, capacity: 4, status: 'available' },
            ];
            setTables(mockTables);
            setSelectedTableId(mockTables[0].id);
          } else {
            console.warn('⚠️ No available tables at the moment');
            setError('Sorry, no tables are available right now. Please try again later.');
            setTables(allTables); // Show all tables but disable booking
          }
        } else {
          setTables(availableTables);
          // Select first available table by default
          setSelectedTableId(availableTables[0].id);
          console.log(`✅ Selected table: ${availableTables[0].table_number}`);
        }
      } catch (err: any) {
        console.error('❌ Error fetching tables:', err.message);
        console.error('   Response:', err.response?.data);
        
        // Silently use mock tables as fallback
        const mockTables = [
          { id: 'table-1', table_number: 1, capacity: 2, status: 'available' },
          { id: 'table-2', table_number: 2, capacity: 4, status: 'available' },
          { id: 'table-3', table_number: 3, capacity: 6, status: 'available' },
          { id: 'table-4', table_number: 4, capacity: 2, status: 'available' },
          { id: 'table-5', table_number: 5, capacity: 4, status: 'available' },
        ];
        setTables(mockTables);
        setSelectedTableId(mockTables[0].id);
        console.log('⚠️ Using fallback mock tables');
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId.trim()) {
      fetchTables();
    } else {
      // No restaurantId, use mock tables
      const mockTables = [
        { id: 'table-1', table_number: 1, capacity: 2, status: 'available' },
        { id: 'table-2', table_number: 2, capacity: 4, status: 'available' },
        { id: 'table-3', table_number: 3, capacity: 6, status: 'available' },
        { id: 'table-4', table_number: 4, capacity: 2, status: 'available' },
        { id: 'table-5', table_number: 5, capacity: 4, status: 'available' },
      ];
      setTables(mockTables);
      setSelectedTableId(mockTables[0].id);
      setLoading(false);
    }
  }, [restaurantId]);

  const suggestion = useMemo(() => {
    if (guests <= 2) return { table: 5, seats: 2 };
    if (guests <= 4) return { table: 12, seats: 4 };
    if (guests <= 6) return { table: 8, seats: 6 };
    return { table: 3, seats: 8 };
  }, [guests]);

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSave = async () => {
    // ===== COMPREHENSIVE VALIDATION =====
    console.log('🔍 Starting booking validation...');
    console.log('📝 Params received:', { restaurantId, reservationId, name: restaurantName });
    
    const isUpdating = reservationId.trim().length > 0;
    
    // CRITICAL: Check if we have required data
    if (!isUpdating && (!restaurantId || restaurantId.trim() === '')) {
      console.error('❌ CRITICAL: restaurantId is empty!');
      Alert.alert(
        'Missing Restaurant Info',
        'Restaurant information was not passed correctly. Please go back to the restaurant detail page and try clicking "Book a Table" again.',
        [
          {
            text: 'Go Back',
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }
    
    // For updates, skip name and email validation since we're not modifying those
    if (!isUpdating) {
      // 1. Validate Name (only for new bookings)
      if (!bookingName.trim()) {
        Alert.alert('Name Required', 'Please enter your full name for the booking');
        return;
      }
      if (bookingName.trim().length < 2) {
        Alert.alert('Invalid Name', 'Name must be at least 2 characters long');
        return;
      }

      // 2. Validate Email (only for new bookings)
      if (!bookingEmail.trim()) {
        Alert.alert('Email Required', 'Please enter your email address');
        return;
      }
      if (!isValidEmail(bookingEmail.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., user@example.com)');
        return;
      }
    }

    // 3. Validate Guests
    if (guests < 1 || guests > 20) {
      Alert.alert('Invalid Party Size', 'Please select between 1 and 20 guests');
      return;
    }

    // 4. Validate Date
    if (!selectedDate) {
      Alert.alert('Date Required', 'Please select a date for your reservation');
      return;
    }

    // 5. Validate Time
    if (!selectedTime) {
      Alert.alert('Time Required', 'Please select a time for your reservation');
      return;
    }

    // 6. Validate Table Selection
    if (!selectedTableId) {
      Alert.alert('Table Required', 'Please select a table from the available options');
      return;
    }

    console.log('✅ All frontend validations passed!');
    console.log('📋 Operation:', isUpdating ? 'UPDATE existing booking' : 'CREATE new booking');

    try {
      setSubmitting(true);
      
      // Get auth token with detailed logging
      console.log('=== BOOKING REQUEST START ===');
      const token = await AsyncStorage.getItem('token');
      console.log('✓ Token retrieved from storage:', token ? `${token.length} chars` : '❌ NULL');
      
      if (!token) {
        Alert.alert(
          'Login Required', 
          'No auth token found. Please log in again.',
          [
            {
              text: 'Go to Login',
              onPress: () => router.push('/login'),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setSubmitting(false);
        return;
      }

      // Format date and time
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      const timeStr = convertTimeToHHMM(selectedTime);

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      let response;
      let successMessage;

      if (isUpdating) {
        // Update existing reservation
        const updatePayload = {
          table_id: selectedTableId,
          reservation_date: dateStr,
          reservation_time: timeStr,
          party_size: guests,
          special_request: specialRequests.trim(),
        };

        console.log('📦 Update payload:', {
          reservation_id: reservationId,
          ...updatePayload,
        });
        
        console.log('Request URL:', `${API_URL}/api/reservations/${reservationId}/update`);
        console.log('Request method: PATCH');

        response = await axios.patch(
          `${API_URL}/api/reservations/${reservationId}/update`,
          updatePayload,
          { headers }
        );
        successMessage = 'Your booking has been updated successfully';
        
        console.log('✅ Booking updated successfully!');
      } else {
        // Create new reservation
        const createPayload = {
          restaurant_id: restaurantId,
          table_id: selectedTableId,
          reservation_date: dateStr,
          reservation_time: timeStr,
          party_size: guests,
          special_request: specialRequests.trim(),
          customer_name: bookingName.trim(),
          customer_email: bookingEmail.trim(),
        };

        console.log('📦 CREATE PAYLOAD:', JSON.stringify(createPayload, null, 2));
        console.log('Request URL:', `${API_URL}/api/reservations`);
        console.log('Request method: POST');

        response = await axios.post(
          `${API_URL}/api/reservations`,
          createPayload,
          { headers }
        );
        successMessage = 'Your booking has been created successfully';
        
        console.log('✅ Booking created successfully!');
      }

      console.log('Response:', response.data);
      console.log('Response type:', typeof response.data);
      console.log('Is array?', Array.isArray(response.data));

      const booking = Array.isArray(response.data) ? response.data[0] : response.data;
      console.log('Booking object:', booking);
      
      const bookingRef = booking?.id || booking?.reservation_id || 'REF-' + Date.now();
      console.log('Booking reference:', bookingRef);
      
      Alert.alert('Success', successMessage, [
        {
          text: 'View Booking',
          onPress: () => {
            if (isUpdating) {
              router.push('/(tabs)/bookings');
            } else {
              // Get selected table object to get the actual table number
              const selectedTable = tables.find(t => t.id === selectedTableId);
              const tableNumber = selectedTable?.table_number || selectedTable?.id || selectedTableId;
              
              // Navigate to confirmation screen for new bookings
              router.push({
                pathname: '/booking-confirmation',
                params: {
                  bookingId: bookingRef,
                  id: bookingRef,
                  name: restaurantName,
                  ref: bookingRef,
                  date: dateStr,
                  time: selectedTime,  // Use readable format (e.g., "7:30pm")
                  guests: String(guests),
                  table: String(tableNumber),
                  bookingName,
                  bookingEmail,
                  address: params.address || '',
                  specialRequests: specialRequests.trim(),
                },
              } as any);
            }
          },
        },
      ]);
    } catch (err: any) {
      console.error('=== BOOKING ERROR ===');
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      console.error('Status code:', err.response?.status);
      console.error('Status text:', err.response?.statusText);
      console.error('Response data:', err.response?.data);
      console.error('Request URL:', err.config?.url);
      
      let errorMsg = 'Booking failed. Please try again.';
      
      if (err.response?.status === 401) {
        errorMsg = 'Session expired. Please login again.';
      } else if (err.response?.status === 400) {
        errorMsg = err.response.data?.error || 'Invalid booking details';
      } else if (err.response?.status === 500) {
        errorMsg = 'Server error. Please try again later.';
      } else if (err.message === 'Network Error') {
        errorMsg = 'Network error. Check your connection and that the backend is running.';
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      Alert.alert('Booking Failed', errorMsg, [
        {
          text: 'Login Again',
          onPress: () => router.push('/login'),
        },
        {
          text: 'Dismiss',
          style: 'cancel',
        },
      ]);
    } finally {
      setSubmitting(false);
      console.log('=== BOOKING REQUEST END ===');
    }
  };

  // Helper: Convert "7:30pm" to "19:30"
  function convertTimeToHHMM(timeStr: string): string {
    const lower = timeStr.toLowerCase();
    let [time, period] = [lower.slice(0, -2), lower.slice(-2)];
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading tables...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{reservationId ? 'Modify Booking' : 'New Booking'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Restaurant card */}
        <View style={styles.restaurantCard}>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
          {params.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.addressText}>{params.address}</Text>
            </View>
          ) : null}
        </View>

        {/* Form Legend */}
        <View style={styles.legendBox}>
          <Text style={styles.legendText}>
            <Text style={{color: '#E74C3C'}}>*</Text> Required fields
            <Text style={{color: Colors.gray}}> • (Optional) fields</Text>
          </Text>
        </View>

        {/* Date section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={16} color={Colors.gray} />
            <Text style={styles.sectionLabel}>Date <Text style={{color: '#E74C3C'}}>*</Text></Text>
          </View>

          <View style={styles.dateHeaderRow}>
            <Text style={styles.dateTitle}>{formatDateHeader(selectedDate)}</Text>
            <TouchableOpacity style={styles.calendarBtn}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <Ionicons name="chevron-down" size={14} color={Colors.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickDatesRow}
          >
            {quickDates.map((d, i) => {
              const isActive =
                d.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dateChip, isActive && styles.dateChipActive]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text
                    style={[
                      styles.dateChipDay,
                      isActive && styles.dateChipTextActive,
                    ]}
                  >
                    {DAYS[d.getDay()]}
                  </Text>
                  <Text
                    style={[
                      styles.dateChipNum,
                      isActive && styles.dateChipTextActive,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                  <Text
                    style={[
                      styles.dateChipMonth,
                      isActive && styles.dateChipTextActive,
                    ]}
                  >
                    {MONTHS[d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={16} color={Colors.gray} />
            <Text style={styles.sectionLabel}>Time <Text style={{color: '#E74C3C'}}>*</Text></Text>
          </View>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((slot) => {
              const isActive = slot === selectedTime;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.timeChip, isActive && styles.timeChipActive]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      isActive && styles.timeChipTextActive,
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Party size */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={16} color={Colors.gray} />
            <Text style={styles.sectionLabel}>Party size <Text style={{color: '#E74C3C'}}>*</Text></Text>
          </View>
          <View style={styles.partyRow}>
            <Text style={styles.guestsLabel}>
              {guests} Guest{guests > 1 ? 's' : ''}
            </Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setGuests(Math.max(1, guests - 1))}
              >
                <Ionicons name="remove" size={20} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepValue}>{guests}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, styles.stepBtnPlus]}
                onPress={() => setGuests(Math.min(20, guests + 1))}
              >
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Availability check */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={16} color={Colors.gray} />
            <Text style={styles.sectionLabel}>Select Table <Text style={{color: '#E74C3C'}}>*</Text></Text>
          </View>
          
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : tables.length === 0 ? (
            <Text style={styles.suggestedTable}>No tables available</Text>
          ) : (
            <View style={styles.tablesGrid}>
              {tables.map((table) => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableCard,
                    selectedTableId === table.id && styles.tableCardSelected,
                    table.status !== 'available' && styles.tableCardUnavailable,
                  ]}
                  onPress={() => table.status === 'available' && setSelectedTableId(table.id)}
                  disabled={table.status !== 'available'}
                >
                  <Ionicons name="grid" size={24} color={selectedTableId === table.id ? Colors.primary : Colors.gray} />
                  <Text style={[
                    styles.tableNumber,
                    selectedTableId === table.id && styles.tableNumberActive,
                  ]}>
                    Table {table.table_number}
                  </Text>
                  <Text style={styles.tableCapacity}>{table.capacity} seats</Text>
                  <Text style={[
                    styles.tableStatus,
                    table.status === 'available' && styles.tableStatusAvailable,
                  ]}>
                    {table.status === 'available' ? 'Available' : 'Not Available'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Special Requests */}
        <Text style={styles.fieldLabel}>Special Requests <Text style={{color: Colors.gray}}>(Optional)</Text></Text>
        <View style={styles.textAreaWrap}>
          <TextInput
            style={styles.textArea}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            placeholder="Any special requests?"
            placeholderTextColor={Colors.gray}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Booking name */}
        <Text style={styles.fieldLabel}>Booking name <Text style={{color: '#E74C3C'}}>*</Text></Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={bookingName}
            onChangeText={setBookingName}
            placeholder="Full name"
            placeholderTextColor={Colors.gray}
          />
        </View>

        {/* Booking email */}
        <Text style={styles.fieldLabel}>Booking email <Text style={{color: '#E74C3C'}}>*</Text></Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={bookingEmail}
            onChangeText={setBookingEmail}
            placeholder="Email address"
            placeholderTextColor={Colors.gray}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.saveBtnText}>Booking...</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
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
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: Colors.text,
  },

  /* Restaurant card */
  restaurantCard: {
    backgroundColor: Colors.text,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  restaurantName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: '#FFF',
    marginBottom: 4,
  },
  restaurantTags: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },

  /* Legend */
  legendBox: {
    backgroundColor: '#F0F3F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  legendText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.text,
    lineHeight: 16,
  },

  /* Section card */
  section: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    backgroundColor: '#FFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },

  /* Date */
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickDatesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateChip: {
    width: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  dateChipDay: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 2,
  },
  dateChipNum: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  dateChipMonth: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  dateChipTextActive: {
    color: '#FFF',
  },

  /* Time */
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  timeChipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  timeChipText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
  timeChipTextActive: {
    color: '#FFF',
  },

  /* Party size */
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestsLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnPlus: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    minWidth: 20,
    textAlign: 'center',
  },

  /* Availability */
  availLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 6,
  },
  suggestedTable: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 6,
  },
  suggestedDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    marginBottom: 4,
  },
  suggestedNote: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
  },

  /* Form fields */
  fieldLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 8,
  },
  textAreaWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    minHeight: 90,
  },
  textArea: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.text,
    minHeight: 60,
  },
  inputWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    color: Colors.text,
  },

  /* Bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  saveBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
  },

  /* Table selection */
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  tableCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  tableCardUnavailable: {
    opacity: 0.5,
  },
  tableNumber: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: Colors.text,
    marginTop: 6,
  },
  tableNumberActive: {
    color: Colors.primary,
  },
  tableCapacity: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 4,
  },
  tableStatus: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: Colors.gray,
    marginTop: 6,
  },
  tableStatusAvailable: {
    color: '#2BA15C',
    fontFamily: 'PlusJakartaSans-Medium',
  },

  /* Loading and errors */
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 12,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#E74C3C',
  },
});
