import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

/* ── FAQ Data ── */

type FAQ = {
  id: string;
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  {
    id: 'faq1',
    question: 'How do I modify or cancel a reservation?',
    answer:
      'Open Booking History, select an upcoming reservation, then choose Modify or Cancel.',
  },
  {
    id: 'faq2',
    question: "Why can't I book as a guest?",
    answer:
      'Guest bookings are only available at select restaurants. Please sign in or create an account to book at all participating venues.',
  },
  {
    id: 'faq3',
    question: 'Where can I see booking updates?',
    answer:
      'All booking updates appear in the Notifications tab. You can also check your Booking History for the latest status.',
  },
];

/* ── Component ── */

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>('faq1');

  const toggleFaq = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSub}>
            Reservation help and key support links
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Assistance banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIcon}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.primary} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Need reservation assistance?</Text>
            <Text style={styles.bannerDesc}>
              Use the pages below to quickly resolve common booking issues.
            </Text>
          </View>
        </View>

        {/* Quick access */}
        <View style={styles.quickCard}>
          <Text style={styles.quickTitle}>Quick access</Text>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(tabs)/bookings' as any)}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.text} />
            <Text style={styles.quickLabel}>Booking History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={20} color={Colors.text} />
            <Text style={styles.quickLabel}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() =>
              Linking.openURL('mailto:support@rra.app?subject=Support%20Request')
            }
          >
            <Ionicons name="mail-outline" size={20} color={Colors.text} />
            <Text style={styles.quickLabel}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.faqCard}>
          <Text style={styles.faqSectionTitle}>Reservation FAQs</Text>

          {FAQS.map((faq) => {
            const isOpen = expanded === faq.id;
            return (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFaq(faq.id)}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.gray}
                  />
                </TouchableOpacity>
                {isOpen && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </View>
            );
          })}
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Banner */
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
    padding: 18,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF6E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  bannerDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.gray,
  },

  /* Quick access */
  quickCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
    padding: 18,
    marginBottom: 16,
  },
  quickTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  quickLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: Colors.text,
  },

  /* FAQs */
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FEFCF4',
    padding: 18,
  },
  faqSectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  faqItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 14,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    paddingRight: 8,
  },
  faqAnswer: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray,
    marginTop: 10,
  },
});
