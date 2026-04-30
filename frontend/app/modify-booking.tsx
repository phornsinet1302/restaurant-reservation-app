import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { API_CONFIG } from '@/app/config/apiConfig';
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

import { useAppToast } from '@/components/ToastProvider';

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

// Convert time from 12-hour format (e.g., "7:30pm") to 24-hour HH:MM format (e.g., "19:30")
function convertTo24HourFormat(time12: string): string {
  const match = time12.match(/^(\d{1,2}):?(\d{2})?(am|pm)$/i);
  if (!match) return time12; // Return unchanged if format doesn't match
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const meridiem = match[3].toLowerCase();
  
  if (meridiem === 'pm' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }
  
  return `${String(hours).padStart(2, '0')}:${minutes}`;
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
    restaurantName: string;
    bookingName: string;
    bookingEmail: string;
    address: string;
    date?: string;
    time?: string;
    guests?: string;
    table?: string;
    ref?: string;
    specialRequests?: string;
  }>();
  const { toast, confirm } = useAppToast();
  const router = useRouter();

  /* State */
  const baseDate = new Date();
  const quickDates = useMemo(() => getUpcomingDates(new Date(), 30), []);

  const [selectedDate, setSelectedDate] = useState(baseDate);
  const [selectedTime, setSelectedTime] = useState('7:30pm');
  const [guests, setGuests] = useState(2);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [existingTableId, setExistingTableId] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [allTablesFromAPI, setAllTablesFromAPI] = useState<any[]>([]); // Store original tables
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const reservationId = params.id?.trim() || '';
  const restaurantId = params.restaurantId?.trim() || '';
  const restaurantName = params.restaurantName || 'Restaurant';

  // Pre-fill form with existing booking data
  useEffect(() => {
    if (params.date) {
      try {
        const existingDate = new Date(params.date);
        if (!isNaN(existingDate.getTime())) {
          setSelectedDate(existingDate);
        }
      } catch (err) {
        console.log('Error parsing date:', err);
      }
    }

    if (params.time) {
      setSelectedTime(params.time);
    }

    if (params.guests) {
      const parsedGuests = parseInt(params.guests, 10);
      if (!isNaN(parsedGuests)) {
        setGuests(parsedGuests);
      }
    }

    console.log('📝 Pre-filling form with existing booking data:', {
      date: params.date,
      time: params.time,
      guests: params.guests,
      table: params.table,
      specialRequests: params.specialRequests,
      bookingName: params.bookingName,
      bookingEmail: params.bookingEmail,
    });

    // Store existing table ID for later pre-selection
    if (params.table) {
      setExistingTableId(params.table);
    }

    // Pre-fill special requests from existing booking
    if (params.specialRequests) {
      setSpecialRequests(params.specialRequests);
    }

    // Pre-fill booking name and email from existing booking
    if (params.bookingName) {
      setBookingName(params.bookingName);
    }
    if (params.bookingEmail) {
      setBookingEmail(params.bookingEmail);
    }
  }, [params.date, params.time, params.guests, params.table, params.specialRequests, params.bookingName, params.bookingEmail]);

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
          const decoded = decodeJwtPayload(token);
          if (decoded?.email) {
            setBookingEmail(decoded.email);
          } else {
            console.log('Could not decode JWT: missing email claim');
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
          setAllTablesFromAPI([]);
          setTables([]);
          setError('Restaurant information is missing. Please go back and try again.');
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${API_URL}/api/tables?restaurant_id=${restaurantId}`
        );
        
        console.log('📊 Tables API response:', response.data);
        
        const allTables = response.data || [];
        console.log(`   Total tables from API: ${allTables.length}`);
        
        // Store all tables - filtering by guest count will happen in separate useEffect
        if (allTables.length === 0) {
          console.warn('⚠️ No tables found for this restaurant');
          setAllTablesFromAPI([]);
          setTables([]);
          setError('This restaurant has no tables set up yet. Please contact the restaurant.');
        } else {
          setAllTablesFromAPI(allTables);
          // Will be filtered by second useEffect based on guest count
        }
      } catch (err: any) {
        console.error('❌ Error fetching tables:', err.message);
        console.error('   Response:', err.response?.data);
        
        setAllTablesFromAPI([]);
        setTables([]);
        setError('Could not load tables. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId.trim()) {
      fetchTables();
    } else {
      setAllTablesFromAPI([]);
      setTables([]);
      setError('Restaurant information is missing. Please go back and try again.');
      setLoading(false);
    }
  }, [restaurantId]);

  // Filter tables based on guest count (without re-fetching from API)
  useEffect(() => {
    if (allTablesFromAPI.length === 0) return;
    
    const availableTables = allTablesFromAPI.filter((t: any) => t.status === 'available' && t.capacity >= guests);
    
    if (availableTables.length > 0) {
      setTables(availableTables);
      
      // Try to pre-select the existing table if it's still available and meets capacity
      if (existingTableId) {
        const existingTableStillValid = availableTables.find((t: any) => t.id === existingTableId);
        if (existingTableStillValid) {
          console.log('✅ Existing table is still available:', existingTableId);
          setSelectedTableId(existingTableId);
        } else {
          // Existing table is not available for this guest count
          console.log('⚠️ Existing table not available for current guest count. Selecting first available table.');
          setSelectedTableId(availableTables[0].id);
        }
      } else if (selectedTableId) {
        // Keep previously selected table if it still meets capacity
        const stillValid = availableTables.find((t: any) => t.id === selectedTableId);
        if (!stillValid) {
          setSelectedTableId(availableTables[0].id);
        }
      } else {
        setSelectedTableId(availableTables[0].id);
      }
      setError('');
    } else {
      // No tables with sufficient capacity
      const tablesWithCapacity = allTablesFromAPI.filter((t: any) => t.capacity >= guests);
      if (tablesWithCapacity.length > 0) {
        setTables(tablesWithCapacity);
        // Try to show existing table even if not available
        if (existingTableId && tablesWithCapacity.find((t: any) => t.id === existingTableId)) {
          setSelectedTableId(existingTableId);
        } else {
          setSelectedTableId(null);
        }
        setError('Sorry, no available tables with enough capacity right now. Please try another time.');
      } else {
        setTables(allTablesFromAPI);
        setSelectedTableId(null);
        setError(`Sorry, no tables available for ${guests} guests. Please try another time or adjust your party size.`);
      }
    }
  }, [guests, allTablesFromAPI, existingTableId]);

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

  const handleSave = () => {
    // ===== COMPREHENSIVE VALIDATION =====
    console.log('🔍 Starting booking validation...');
    console.log('📝 Params received:', { restaurantId, reservationId, name: restaurantName });
    
    const isUpdating = reservationId.trim().length > 0;
    
    // CRITICAL: Check if we have required data
    if (!isUpdating && (!restaurantId || restaurantId.trim() === '')) {
      console.error('❌ CRITICAL: restaurantId is empty!');
      confirm('Missing Restaurant Info', 'Restaurant information was not passed correctly. Please go back to the restaurant detail page and try clicking "Book a Table" again.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      return;
    }
    
    // For updates, skip name and email validation since we're not modifying those
    if (!isUpdating) {
      // 1. Validate Name (only for new bookings)
      if (!bookingName.trim()) {
        toast('Please enter your full name for the booking', 'warning');
        return;
      }
      if (bookingName.trim().length < 2) {
        toast('Name must be at least 2 characters long', 'warning');
        return;
      }

      // 2. Validate Email (only for new bookings)
      if (!bookingEmail.trim()) {
        toast('Please enter your email address', 'warning');
        return;
      }
      if (!isValidEmail(bookingEmail.trim())) {
        toast('Please enter a valid email address (e.g., user@example.com)', 'warning');
        return;
      }
    }

    // 3. Validate Guests
    if (guests < 1 || guests > 20) {
      toast('Please select between 1 and 20 guests', 'warning');
      return;
    }

    // 4. Validate Date
    if (!selectedDate) {
      toast('Please select a date for your reservation', 'warning');
      return;
    }

    // 5. Validate Time
    if (!selectedTime) {
      toast('Please select a time for your reservation', 'warning');
      return;
    }

    // 6. Validate Table Selection
    if (!selectedTableId) {
      toast('Please select a table from the available options', 'warning');
      return;
    }

    console.log('✅ All frontend validations passed!');
    console.log('📋 Operation:', isUpdating ? 'UPDATE existing booking' : 'CREATE new booking');

    // Format date and time
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const timeStr = convertTimeToHHMM(selectedTime);
    const time24hr = convertTo24HourFormat(selectedTime);

    console.log('✅ All validations passed! Navigating to booking confirmation...');
    
    // Get selected table object for table number
    const selectedTable = tables.find(t => t.id === selectedTableId);
    const tableNumber = selectedTable?.table_number || selectedTable?.id || selectedTableId;
    
    // For updates, use existing reservation ID; for new bookings, create new ref
    const bookingRef = isUpdating ? reservationId : 'REF-' + Date.now();

    console.log('📊 Navigation Params:', {
      isUpdating,
      reservationId: isUpdating ? reservationId : 'N/A',
      restaurantId,
      tableId: selectedTableId,
      time12hr: selectedTime,
      time24hr,
    });

    // Navigate to confirmation screen - booking will be created/updated when user confirms
    router.push({
      pathname: '/booking-confirmation',
      params: {
        reservationId: reservationId,  // Pass reservation ID for updates
        bookingId: bookingRef,
        id: bookingRef,
        name: restaurantName,
        ref: bookingRef,
        date: dateStr,
        time: time24hr,
        guests: String(guests),
        table: String(tableNumber),
        restaurantId,
        tableId: selectedTableId,
        bookingName,
        bookingEmail,
        address: params.address || '',
        specialRequests: specialRequests.trim(),
      },
    } as any);
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
              <Ionicons name="location-outline" size={14} color={Colors.text} />
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
            <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowCalendarModal(true)}>
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

      {/* ── Calendar Modal ── */}
      {showCalendarModal && (
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCalendarMonth(newMonth);
              }}>
                <Ionicons name="chevron-back" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCalendarMonth(newMonth);
              }}>
                <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysRow}>
              {DAYS.map((day) => (
                <Text key={day} style={styles.weekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {getCalendarDays(calendarMonth).map((day, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calendarDay,
                    !day && styles.calendarDayEmpty,
                    day && new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day).toDateString() === selectedDate.toDateString() ? styles.calendarDaySelected : null,
                    day && new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) < new Date() ? styles.calendarDayPast : null,
                  ]}
                  onPress={() => {
                    if (day) {
                      const newDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                      setSelectedDate(newDate);
                      setShowCalendarModal(false);
                    }
                  }}
                  disabled={!day || new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) < new Date()}
                >
                  {day ? (
                    <Text style={[
                      styles.calendarDayText,
                      day && new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day).toDateString() === selectedDate.toDateString() ? { color: '#FFF' } : {}
                    ]}>
                      {day}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setShowCalendarModal(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Helper function to get calendar days for a month
function getCalendarDays(date: Date): (number | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days: (number | null)[] = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return days;
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
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  restaurantName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  restaurantTags: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.text,
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
    color: Colors.text,
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
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  tableCard: {
    width: '47%',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    minHeight: 120,
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

  /* Calendar Modal */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
  },
  modalClose: {
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.primary,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekDay: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: Colors.gray,
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 4,
  },
  calendarDayEmpty: {
    backgroundColor: 'transparent',
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayPast: {
    opacity: 0.4,
  },
  calendarDayText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.text,
  },
});
