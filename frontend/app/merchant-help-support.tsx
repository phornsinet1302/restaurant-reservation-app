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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ── FAQ Data (Merchant-focused) ── */

type FAQ = {
  id: string;
  question: string;
  answer: string;
};

const FAQS: FAQ[] = [
  {
    id: 'faq1',
    question: 'How do I add or manage tables?',
    answer:
      'Go to the Tables tab on your dashboard. You can add new tables with specific capacity, edit existing tables, or mark them as unavailable during busy periods.',
  },
  {
    id: 'faq2',
    question: 'How do I handle incoming reservations?',
    answer:
      'All new reservations appear in the Bookings tab. You can approve, decline, or modify them. Customers are notified automatically when you update a booking status.',
  },
  {
    id: 'faq3',
    question: 'How do I update my restaurant profile?',
    answer:
      'Tap "Edit Profile" from your profile screen or go to your restaurant listing to update your name, description, photos, opening hours, cuisine type, and cover image.',
  },
  {
    id: 'faq4',
    question: 'How do I manage my menu?',
    answer:
      'Go to the Menu tab to add, edit, or remove menu items. You can set prices, upload photos, mark items as available or sold out, and organize them into categories.',
  },
  {
    id: 'faq5',
    question: 'How do I publish or unpublish my restaurant?',
    answer:
      'From your restaurant listing page, fill in all required fields and tap "Publish" to make your restaurant visible to customers. You can unpublish at any time from the same page.',
  },
  {
    id: 'faq6',
    question: 'How do customers find my restaurant?',
    answer:
      'Once published, your restaurant appears in the customer search and discovery feed. Make sure your profile is complete with photos, description, and accurate location to attract more bookings.',
  },
];

/* ── Component ── */

export default function MerchantHelpSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>('faq1');

  const toggleFaq = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 60) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSub}>
            Restaurant management help and support
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
            <Ionicons name="storefront-outline" size={28} color={Colors.primary} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Need help managing your restaurant?</Text>
            <Text style={styles.bannerDesc}>
              Quick links and FAQs to help you manage reservations, tables, and your listing.
            </Text>
          </View>
        </View>

        {/* Quick access */}
        <View style={styles.quickCard}>
          <Text style={styles.quickTitle}>Quick access</Text>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(merchant-tabs)/bookings' as any)}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.text} />
            <Text style={styles.quickLabel}>Manage Reservations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(merchant-tabs)/tables' as any)}
          >
            <Ionicons name="grid-outline" size={20} color={Colors.text} />
            <Text style={styles.quickLabel}>Manage Tables</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(merchant-tabs)/menu' as any)}
          >
            <Ionicons name="restaurant-outline" size={20} color={Colors.text} />
            <Text style={styles.quickLabel}>Manage Menu</Text>
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
              Linking.openURL('mailto:merchant-support@rra.app?subject=Restaurant%20Support%20Request')
            }
          >
            <Ionicons name="mail-outline" size={20} color={Colors.text} />
            <Text style={styles.quickLabel}>Contact Merchant Support</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.faqCard}>
          <Text style={styles.faqSectionTitle}>Restaurant Owner FAQs</Text>

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
