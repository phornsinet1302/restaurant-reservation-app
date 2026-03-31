import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const TECH_CHIPS = ['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'shadcn/ui'];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>About</Text>
        </View>

        {/* Logo & Version */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>FoodReserve</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        {/* Our Mission */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.cardBody}>
            FoodReserve connects diners with the best restaurants in their city. We make it easy to discover new places, book tables instantly, and enjoy seamless dining experiences.
          </Text>
        </View>

        {/* For Restaurants */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>For Restaurants</Text>
          <Text style={styles.cardBody}>
            Our restaurant dashboard helps you manage reservations, menus, tables, and customer engagement all in one place. Grow your business with powerful tools designed for the hospitality industry.
          </Text>
        </View>

        {/* Built With */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Built With</Text>
          <View style={styles.chipRow}>
            {TECH_CHIPS.map((tech) => (
              <View key={tech} style={styles.chip}>
                <Text style={styles.chipText}>{tech}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Made with care in Phnom Penh, Cambodia</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: Colors.text,
  },

  logoSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F5F0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  version: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
  },

  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FEFCF4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: Colors.gray,
    lineHeight: 22,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: Colors.text,
  },

  footer: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 16,
  },
});
