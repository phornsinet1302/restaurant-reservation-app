import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Colors } from '@/constants/Colors';

const SAMPLE_TABLES = [
  { id: '1', number: 1, seats: 4, status: 'available' as const },
  { id: '2', number: 2, seats: 2, status: 'occupied' as const },
  { id: '3', number: 3, seats: 6, status: 'available' as const },
  { id: '4', number: 4, seats: 4, status: 'reserved' as const },
  { id: '5', number: 5, seats: 8, status: 'available' as const },
  { id: '6', number: 6, seats: 2, status: 'occupied' as const },
];

type TableStatus = 'available' | 'occupied' | 'reserved';

const statusColors: Record<TableStatus, string> = {
  available: '#4CAF50',
  occupied: '#F44336',
  reserved: '#FF9800',
};

export default function TablesScreen() {
  const renderTable = ({ item }: { item: (typeof SAMPLE_TABLES)[0] }) => (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableNumber}>Table {item.number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.seatsText}>🪑 {item.seats} seats</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={SAMPLE_TABLES}
        renderItem={renderTable}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 12,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  tableCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  seatsText: {
    fontSize: 14,
    color: Colors.gray,
  },
});
