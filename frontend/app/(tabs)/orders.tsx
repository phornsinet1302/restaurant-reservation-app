import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Colors } from '@/constants/Colors';

const SAMPLE_ORDERS = [
  { id: '1', table: 3, items: 4, total: 45.90, status: 'preparing' as const },
  { id: '2', table: 1, items: 2, total: 22.50, status: 'served' as const },
  { id: '3', table: 5, items: 6, total: 78.00, status: 'pending' as const },
];

type OrderStatus = 'pending' | 'preparing' | 'served';

const statusColors: Record<OrderStatus, string> = {
  pending: '#FF9800',
  preparing: '#2196F3',
  served: '#4CAF50',
};

export default function OrdersScreen() {
  const renderOrder = ({ item }: { item: (typeof SAMPLE_ORDERS)[0] }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderTitle}>Order #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.detailText}>🍽️ Table {item.table}</Text>
        <Text style={styles.detailText}>📋 {item.items} items</Text>
        <Text style={styles.totalText}>${item.total.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={SAMPLE_ORDERS}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
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
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: Colors.gray,
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
