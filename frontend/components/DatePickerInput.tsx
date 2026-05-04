import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Modal,
  ScrollView,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface DatePickerInputProps {
  value: string; // Format: DD/MM/YYYY
  onChangeText: (value: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  editable?: boolean;
  /** When true, hides the component's own border (use when parent already provides a border) */
  noBorder?: boolean;
  /** Show red error border */
  hasError?: boolean;
  /** Custom style for the input wrapper */
  style?: ViewStyle;
}

// Helper function to format Date object to DD/MM/YYYY
const formatDateToDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to parse DD/MM/YYYY to Date object
const parseDDMMYYYY = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateStr.match(regex);
  
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // Month is 0-indexed
  const year = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  
  // Validate the date is real (e.g. not Feb 30)
  if (isNaN(date.getTime()) || date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
};

// Generate array of years
const generateYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 1900; i--) {
    years.push(i);
  }
  return years;
};

// Generate array of months
const generateMonths = (): { label: string; value: number }[] => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return monthNames.map((label, index) => ({ label, value: index + 1 }));
};

// Generate array of days for a given month/year
const generateDays = (month: number, year: number): number[] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
};

export default function DatePickerInput({
  value,
  onChangeText,
  placeholder = 'DD/MM/YYYY',
  placeholderTextColor = Colors.border,
  editable = true,
  noBorder = false,
  hasError = false,
  style,
}: DatePickerInputProps) {
  const [showPickerModal, setShowPickerModal] = useState(false);

  // Derive picker wheel state from value (or default to a sensible date)
  const initFromValue = (): { day: number; month: number; year: number } => {
    const parsed = parseDDMMYYYY(value);
    if (parsed) {
      return { day: parsed.getDate(), month: parsed.getMonth() + 1, year: parsed.getFullYear() };
    }
    return { day: 1, month: 1, year: 2000 };
  };

  const [selectedDay, setSelectedDay] = useState(() => initFromValue().day);
  const [selectedMonth, setSelectedMonth] = useState(() => initFromValue().month);
  const [selectedYear, setSelectedYear] = useState(() => initFromValue().year);

  // Auto-format with slashes: "11042000" → "11/04/2000"
  const handleManualInput = (text: string) => {
    // Strip everything except digits and slashes
    let digits = text.replace(/[^\d]/g, '');

    // Build formatted string with auto-slashes
    let formatted = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += digits[i];
    }

    onChangeText(formatted);

    // Sync picker wheels if we have a complete valid date
    if (formatted.length === 10) {
      const parsed = parseDDMMYYYY(formatted);
      if (parsed) {
        setSelectedDay(parsed.getDate());
        setSelectedMonth(parsed.getMonth() + 1);
        setSelectedYear(parsed.getFullYear());
      }
    }
  };

  const openPicker = () => {
    // Sync picker state from current value before opening
    const parsed = parseDDMMYYYY(value);
    if (parsed) {
      setSelectedDay(parsed.getDate());
      setSelectedMonth(parsed.getMonth() + 1);
      setSelectedYear(parsed.getFullYear());
    }
    setShowPickerModal(true);
  };

  const handleConfirm = () => {
    // Clamp day to valid range for the selected month/year
    const maxDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const clampedDay = Math.min(selectedDay, maxDay);

    const formatted = `${String(clampedDay).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}/${selectedYear}`;
    onChangeText(formatted);
    setSelectedDay(clampedDay);
    setShowPickerModal(false);
  };

  const years = generateYears();
  const months = generateMonths();
  const days = generateDays(selectedMonth, selectedYear);

  return (
    <View style={styles.container}>
      <View style={[
        styles.inputWrapper,
        noBorder && styles.inputWrapperNoBorder,
        hasError && styles.inputWrapperError,
        style,
      ]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          value={value}
          onChangeText={handleManualInput}
          keyboardType="number-pad"
          editable={editable}
          maxLength={10}
        />
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={openPicker}
          disabled={!editable}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showPickerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Date</Text>
                <Text style={styles.modalPreview}>
                  {String(selectedDay).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Date picker wheels */}
            <View style={styles.pickerContainer}>
              {/* Day Picker */}
              <View style={styles.wheelWrapper}>
                <Text style={styles.wheelLabel}>Day</Text>
                <ScrollView
                  style={styles.wheel}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                >
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.wheelItem, selectedDay === day && styles.wheelItemSelected]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[styles.wheelItemText, selectedDay === day && styles.wheelItemTextSelected]}
                      >
                        {String(day).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month Picker */}
              <View style={styles.wheelWrapper}>
                <Text style={styles.wheelLabel}>Month</Text>
                <ScrollView
                  style={styles.wheel}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                >
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[styles.wheelItem, selectedMonth === month.value && styles.wheelItemSelected]}
                      onPress={() => setSelectedMonth(month.value)}
                    >
                      <Text
                        style={[styles.wheelItemText, selectedMonth === month.value && styles.wheelItemTextSelected]}
                      >
                        {String(month.value).padStart(2, '0')} - {month.label.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles.wheelWrapper}>
                <Text style={styles.wheelLabel}>Year</Text>
                <ScrollView
                  style={styles.wheel}
                  showsVerticalScrollIndicator={false}
                  scrollEventThrottle={16}
                >
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.wheelItem, selectedYear === year && styles.wheelItemSelected]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={[styles.wheelItemText, selectedYear === year && styles.wheelItemTextSelected]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Confirm Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleConfirm}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 0,
    backgroundColor: Colors.background,
    height: 48,
  },
  inputWrapperNoBorder: {
    borderWidth: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 12,
    paddingRight: 8,
    height: 48,
  },
  calendarButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: Colors.text,
  },
  modalPreview: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: Colors.primary,
    marginTop: 2,
  },
  
  // Picker wheels
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 240,
  },
  wheelWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  wheelLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 8,
    textAlign: 'center',
  },
  wheel: {
    flex: 1,
  },
  wheelItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  wheelItemSelected: {
    backgroundColor: Colors.primary + '15',
  },
  wheelItemText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
  },
  wheelItemTextSelected: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.primary,
  },
  
  // Footer
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
