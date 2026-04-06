const supabase = require('./config/supabase');
const { supabaseAdmin } = require('./config/supabase');

async function debugBookingStatuses() {
  try {
    console.log('🔍 Checking all booking statuses in database...\n');

    // Get all reservations with their statuses
    const { data: allBookings, error } = await supabaseAdmin
      .from('reservations')
      .select('id, restaurant_id, status, created_at, reservation_date');

    if (error) {
      console.error('❌ Error fetching reservations:', error.message);
      return;
    }

    console.log(`📊 Total reservations found: ${allBookings?.length || 0}\n`);

    // Group by status
    const statusGroups = {};
    allBookings?.forEach(booking => {
      if (!statusGroups[booking.status]) {
        statusGroups[booking.status] = [];
      }
      statusGroups[booking.status].push(booking);
    });

    console.log('📈 Bookings by Status:');
    Object.entries(statusGroups).forEach(([status, bookings]) => {
      console.log(`\n  ${status.toUpperCase()}: ${bookings.length} bookings`);
      bookings.slice(0, 3).forEach((b, i) => {
        console.log(`    ${i + 1}. ID: ${b.id.slice(0, 8)}... | Restaurant: ${b.restaurant_id.slice(0, 8)}... | Date: ${b.reservation_date}`);
      });
      if (bookings.length > 3) {
        console.log(`    ... and ${bookings.length - 3} more`);
      }
    });

    // Group by restaurant and status
    console.log('\n\n🏪 Bookings by Restaurant:');
    const restaurantMap = {};
    allBookings?.forEach(booking => {
      if (!restaurantMap[booking.restaurant_id]) {
        restaurantMap[booking.restaurant_id] = {};
      }
      if (!restaurantMap[booking.restaurant_id][booking.status]) {
        restaurantMap[booking.restaurant_id][booking.status] = 0;
      }
      restaurantMap[booking.restaurant_id][booking.status]++;
    });

    Object.entries(restaurantMap).forEach(([restId, statuses]) => {
      console.log(`\n  Restaurant: ${restId.slice(0, 8)}...`);
      Object.entries(statuses).forEach(([status, count]) => {
        console.log(`    - ${status}: ${count}`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugBookingStatuses().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
});
