import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAppToast } from '@/components/ToastProvider';

export default function SettingsScreen() {
  const { toast } = useAppToast();
  const settingsItems = [
    { icon: 'restaurant-outline' as const, label: 'Menu Management', subtitle: 'Add and edit menu items' },
    { icon: 'people-outline' as const, label: 'Staff', subtitle: 'Manage staff accounts' },
    { icon: 'notifications-outline' as const, label: 'Notifications', subtitle: 'Configure alerts' },
    { icon: 'color-palette-outline' as const, label: 'Appearance', subtitle: 'Theme and display' },
    { icon: 'information-circle-outline' as const, label: 'About', subtitle: 'App version and info' },
  ];

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        {settingsItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.settingItem} onPress={() => toast(`${item.label} coming soon`, 'info')}>
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={22} color={Colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
});
