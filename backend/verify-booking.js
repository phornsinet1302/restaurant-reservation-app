/**
 * 🔍 Verify Specific Booking - Debug why notifications weren't created
 * Usage: node verify-booking.js
 */

require('dotenv').config();
const supabase = require('./config/supabase');
const { supabaseAdmin } = require('./config/supabase');

async function verifyBooking() {
  console.log(`\n🔍 VERIFY BOOKING WITH NOTIFICATIONS\n`);
  console.log(`================================\n`);

  try {
    // Get the most recent booking
    const { data: bookings, error: bookingError } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (bookingError || !bookings || bookings.length === 0) {
      console.log(`❌ No bookings found`);
      return;
    }

    const booking = bookings[0];
    console.log(`📋 Most Recent Booking:`);
    console.log(`   ID: ${booking.id}`);
    console.log(`   Customer ID: ${booking.customer_id}`);
    console.log(`   Restaurant ID: ${booking.restaurant_id}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Created: ${new Date(booking.created_at).toLocaleString()}\n`);

    // Get restaurant details
    console.log(`🏪 Restaurant Details:`);
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('id, name, merchant_id')
      .eq('id', booking.restaurant_id)
      .single();

    if (restError || !restaurant) {
      console.log(`   ❌ Restaurant not found\n`);
      return;
    }

    console.log(`   Name: ${restaurant.name}`);
    console.log(`   Merchant ID: ${restaurant.merchant_id}\n`);

    // Check for notifications related to this booking
    console.log(`🔔 Checking Notifications for this Booking:`);
    
    // Notifications for customer
    const { data: customerNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', booking.customer_id)
      .in('type', ['booking_created', 'booking_received'])
      .order('created_at', { ascending: false })
      .limit(5);

    // Notifications for merchant  
    const { data: merchantNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', restaurant.merchant_id)
      .in('type', ['booking_created', 'booking_received'])
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`   Customer (${booking.customer_id}) notifications:`);
    if (customerNotifs && customerNotifs.length > 0) {
      customerNotifs.forEach((n, idx) => {
        console.log(`     [${idx + 1}] ${n.type}: "${n.title}"`);
        console.log(`         ${new Date(n.created_at).toLocaleTimeString()}`);
      });
    } else {
      console.log(`     ❌ NO notifications found`);
    }

    console.log(`\n   Merchant (${restaurant.merchant_id}) notifications:`);
    if (merchantNotifs && merchantNotifs.length > 0) {
      merchantNotifs.forEach((n, idx) => {
        console.log(`     [${idx + 1}] ${n.type}: "${n.title}"`);
        console.log(`         ${new Date(n.created_at).toLocaleTimeString()}`);
      });
    } else {
      console.log(`     ❌ NO notifications found`);
    }

    // DIAGNOSIS
    console.log(`\n📊 DIAGNOSIS:\n`);
    
    if ((customerNotifs && customerNotifs.length > 0) || (merchantNotifs && merchantNotifs.length > 0)) {
      console.log(`✅ Notifications ARE in database`);
      console.log(`   ✅ Backend IS creating notifications`);
      console.log(`   ⚠️  Frontend may not be fetching them\n`);
      console.log(`   ACTION: Check:`);
      console.log(`   1. Is /notifi screen loading these notifications?`);
      console.log(`   2. Check browser console for fetch errors`);
      console.log(`   3. Verify WebSocket is connected\n`);
    } else {
      console.log(`❌ NO Notifications in database`);
      console.log(`   ❌ Backend is NOT creating notifications\n`);
      console.log(`   REASON: Check these possibilities:`);
      console.log(`   1. createReservation() not calling createNotification()`);
      console.log(`   2. io object not passed correctly to req.app`);
      console.log(`   3. Database permissions issue (can't insert notifications)\n`);
      console.log(`   ACTION:`);
      console.log(`   1. Check backend console logs when booking was created`);
      console.log(`   2. Look for "📢 Notification created" log`);
      console.log(`   3. Look for any error messages in console\n`);
    }

    // Check permissions by trying to insert a test notification
    console.log(`🧪 Testing Database Permissions:`);
    const testNotif = {
      user_id: booking.customer_id,
      title: '🧪 Test Notification',
      message: 'This is a test to verify permissions',
      type: 'test'
    };

    const { data: testData, error: testError } = await supabaseAdmin
      .from('notifications')
      .insert([testNotif])
      .select();

    if (testError) {
      console.log(`   ❌ Cannot insert notifications: ${testError.message}`);
      console.log(`   ⚠️  Database permissions issue!\n`);
    } else {
      console.log(`   ✅ Can insert notifications successfully`);
      console.log(`   ✅ Permissions are OK\n`);
      
      // Clean up test notification
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', testData[0].id);
    }

  } catch (err) {
    console.error(`\n❌ Error:`, err.message);
  }
}

verifyBooking().then(() => {
  console.log(`================================`);
  console.log(`✅ Verification Complete\n`);
  process.exit(0);
});
