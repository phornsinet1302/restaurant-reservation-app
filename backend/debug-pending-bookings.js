const supabase = require('./config/supabase');

async function debugPendingBookings() {
  try {
    // Get the merchant's restaurant
    const merchantId = 'a8d7e9c3-b4f2-4a1b-8c6d-9e2f1a5b7c3d'; // Replace with actual merchant ID or query all

    // 1. Get all restaurants to find the merchant's restaurant
    const { data: restaurants, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name, merchant_id');

    console.log('📍 All restaurants:', restaurants);

    if (restaurants && restaurants.length > 0) {
      const restaurantId = restaurants[0].id;
      console.log(`\n🏪 Using restaurant: ${restaurants[0].name} (ID: ${restaurantId})`);

      // 2. Get the count of reservations with different status values
      const { data: allReservations, error: allErr } = await supabase
        .from('reservations')
        .select('id, status, restaurant_id, reservation_date, reservation_time')
        .eq('restaurant_id', restaurantId);

      console.log(`\n📊 Total reservations for this restaurant: ${allReservations?.length || 0}`);

      // 3. Group by status
      const statusGroups = {};
      allReservations?.forEach(res => {
        statusGroups[res.status] = (statusGroups[res.status] || 0) + 1;
      });

      console.log('\n📈 Reservations by status:');
      Object.entries(statusGroups).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });

      // 4. Count pending specifically
      const { count: pendingCount, error: pendingErr } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending');

      console.log(`\n⏳ Pending bookings count: ${pendingCount}`);

      // 5. Show a sample of pending bookings
      const { data: pendingBookings } = await supabase
        .from('reservations')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending')
        .limit(3);

      console.log('\n📋 Sample pending bookings:');
      console.log(JSON.stringify(pendingBookings, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugPendingBookings();
