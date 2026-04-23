/**
 * Map GET /api/reservations/:id (joined restaurants, tables) to booking screen params.
 */
export function reservationRowToBookingParams(row: any): Record<string, string> {
  const id = String(row.id || '');
  const ref = `RRA-${id.replace(/-/g, '').slice(0, 5).toUpperCase()}`;
  const timeRaw = (row.reservation_time || '').toString();
  const timeHHMM =
    timeRaw.length >= 5 ? timeRaw.slice(0, 5) : timeRaw;
  const tableNum =
    row.tables?.table_number ?? row.tables?.id ?? row.table_id ?? '';

  return {
    bookingId: id,
    id,
    reservationId: '',
    name: row.restaurants?.name || 'Restaurant',
    ref,
    date: String(row.reservation_date || ''),
    time: timeHHMM,
    guests: String(row.party_size ?? ''),
    table: String(tableNum),
    restaurantId: String(row.restaurant_id || ''),
    tableId: String(row.table_id || ''),
    bookingName: String(row.customer_name || ''),
    bookingEmail: String(row.customer_email || ''),
    address: String(row.restaurants?.address || ''),
    specialRequests: String(row.special_request || ''),
  };
}
