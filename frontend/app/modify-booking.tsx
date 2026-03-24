import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

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
    name: string;
    ref: string;
    date: string;
    time: string;
    guests: string;
    table: string;
    tags: string;
    address: string;
  }>();
  const router = useRouter();

  /* State */
  const baseDate = new Date(params.date ?? '2026-03-15');
  const quickDates = useMemo(() => getUpcomingDates(new Date(), 4), []);

  const [selectedDate, setSelectedDate] = useState(baseDate);
  const [selectedTime, setSelectedTime] = useState(params.time ?? '7:30pm');
  const [guests, setGuests] = useState(parseInt(params.guests ?? '4', 10));
  const [specialRequests, setSpecialRequests] = useState('Window seat preferred');
  const [bookingName, setBookingName] = useState('William');
  const [bookingEmail, setBookingEmail] = useState('william@email.com');

  const suggestion = suggestTable(guests);

  const handleSave = () => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    router.push({
      pathname: '/booking-confirmation',
      params: {
        name: params.name ?? '',
        ref: params.ref ?? '',
        date: dateStr,
        time: selectedTime,
        guests: String(guests),
        table: String(suggestion.table),
        bookingName,
        bookingEmail,
        address: params.address ?? '',
        specialRequests,
      },
    } as any);
  };

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
          <Text style={styles.headerTitle}>Modify Booking</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Restaurant card */}
        <View style={styles.restaurantCard}>
          <Text style={styles.restaurantName}>{params.name}</Text>
          {params.tags ? (
            <Text style={styles.restaurantTags}>{params.tags}</Text>
          ) : null}
          {params.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.addressText}>{params.address}</Text>
            </View>
          ) : null}
        </View>

        {/* Date section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={16} color={Colors.gray} />
            <Text style={styles.sectionLabel}>Date</Text>
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
            <Text style={styles.sectionLabel}>Time</Text>
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
            <Text style={styles.sectionLabel}>Party size</Text>
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
          <Text style={styles.availLabel}>Availability check</Text>
          <Text style={styles.suggestedTable}>
            Suggested table: #{suggestion.table}
          </Text>
          <Text style={styles.suggestedDesc}>
            Best fit for {guests} guest{guests > 1 ? 's' : ''} (up to{' '}
            {suggestion.seats} seats).
          </Text>
          <Text style={styles.suggestedNote}>
            No-show reservations release their table after 30 minutes.
          </Text>
        </View>

        {/* Special Requests */}
        <Text style={styles.fieldLabel}>Special Requests</Text>
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
        <Text style={styles.fieldLabel}>Booking name</Text>
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
        <Text style={styles.fieldLabel}>Booking email</Text>
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
          style={styles.saveBtn}
          activeOpacity={0.8}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Save Changes</Text>
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
  },
  saveBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
  },
});
