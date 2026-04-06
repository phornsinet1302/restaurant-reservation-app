const { supabaseAdmin } = require('./config/supabase');

async function checkBookingStatuses() {
  try {
    console.log('🔍 Checking reservation statuses in database...\n');

    // Get all restaurants first
    const { data: restaurants } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, merchant_id')
      .limit(1);

    if (!restaurants || restaurants.length === 0) {
      console.log('❌ No restaurants found');
      return;
    }

    const restaurant = restaurants[0];
    console.log(`🏪 Restaurant: ${restaurant.name} (ID: ${restaurant.id})`);
    console.log(`👤 Merchant: ${restaurant.merchant_id}\n`);

    // Get all reservations for this restaurant
    const { data: allReservations } = await supabaseAdmin
      .from('reservations')
      .select('id, status, reservation_date, reservation_time, user_id')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(20);

    console.log(`📊 Total reservations (sample): ${allReservations?.length || 0}\n`);

    // Group by status
    const statusCounts = {};
    allReservations?.forEach(res => {
      statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
    });

    console.log('📈 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ✓ "${status}": ${count} bookings`);
    });

    console.log('\n📋 Sample Reservations:');
    allReservations?.slice(0, 5).forEach((res, i) => {
      console.log(`  ${i + 1}. Status: "${res.status}" | Date: ${res.reservation_date} ${res.reservation_time}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBookingStatuses().then(() => process.exit(0));
