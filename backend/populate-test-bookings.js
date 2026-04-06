require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function populateTestBookingStatuses() {
  try {
    console.log('🔄 Populating test booking statuses...\n');

    // Get first restaurant and some of its bookings
    const { data: restaurants, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .limit(1);

    if (restErr || !restaurants || restaurants.length === 0) {
      console.error('❌ No restaurants found');
      return;
    }

    const restaurantId = restaurants[0].id;
    const restaurantName = restaurants[0].name;
    console.log(`🏪 Using restaurant: ${restaurantName} (${restaurantId})\n`);

    // Get pending bookings for this restaurant
    const { data: pendingBookings, error: bookErr } = await supabaseAdmin
      .from('reservations')
      .select('id, reservation_date, reservation_time')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .limit(10);

    if (bookErr) {
      console.error('❌ Error fetching pending bookings:', bookErr.message);
      return;
    }

    if (!pendingBookings || pendingBookings.length === 0) {
      console.error('❌ No pending bookings found to update');
      return;
    }

    console.log(`📋 Found ${pendingBookings.length} pending bookings\n`);

    // Update bookings with different statuses
    const updates = [];

    // First 3 bookings -> confirmed
    for (let i = 0; i < Math.min(3, pendingBookings.length); i++) {
      updates.push({
        id: pendingBookings[i].id,
        status: 'confirmed',
        label: 'Confirmed'
      });
    }

    // Next 2 bookings -> arrived
    for (let i = 3; i < Math.min(5, pendingBookings.length); i++) {
      updates.push({
        id: pendingBookings[i].id,
        status: 'arrived',
        label: 'Arrived'
      });
    }

    // Next 2 bookings -> completed
    for (let i = 5; i < Math.min(7, pendingBookings.length); i++) {
      updates.push({
        id: pendingBookings[i].id,
        status: 'completed',
        label: 'Completed'
      });
    }

    // Execute all updates
    for (const update of updates) {
      const { error } = await supabaseAdmin
        .from('reservations')
        .update({ status: update.status })
        .eq('id', update.id);

      if (error) {
        console.error(`❌ Error updating booking ${update.id}:`, error.message);
      } else {
        console.log(`✅ Updated ${update.label}: ${update.id.slice(0, 8)}...`);
      }
    }

    console.log('\n✅ Test data populated successfully!\n');

    // Verify the updates
    const { data: verifyBookings, error: verifyErr } = await supabaseAdmin
      .from('reservations')
      .select('id, status')
      .eq('restaurant_id', restaurantId);

    if (!verifyErr && verifyBookings) {
      const statusCounts = {};
      verifyBookings.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });

      console.log('📊 Final booking status distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

populateTestBookingStatuses().then(() => {
  console.log('\n✅ Script complete');
  process.exit(0);
});
