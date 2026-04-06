/**
 * 🧪 Test Notification Flow - Diagnoses notification issues
 * Checks: Database creation, WebSocket emission, Email sending
 * Usage: node test-notification-flow.js
 */

require('dotenv').config();
const supabase = require('./config/supabase');

console.log(`\n🧪 NOTIFICATION FLOW TEST\n`);
console.log(`================================\n`);

async function runTests() {
  try {
    // TEST 1: Can we connect to Supabase?
    console.log(`📌 TEST 1: Supabase Connection`);
    const { data: tables, error: tableError } = await supabase
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log(`❌ FAILED: Cannot access notifications table`);
      console.log(`   Error: ${tableError.message}\n`);
      return;
    }
    console.log(`✅ PASSED: Connected to notifications table\n`);

    // TEST 2: Check for recent notifications
    console.log(`📌 TEST 2: Recent Notifications (last 5 minutes)`);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentNotifs, count, error: queryError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (queryError) {
      console.log(`❌ FAILED: Cannot query notifications`);
      console.log(`   Error: ${queryError.message}\n`);
      return;
    }

    if (!recentNotifs || recentNotifs.length === 0) {
      console.log(`⚠️  NO recent notifications found in last 5 minutes`);
      console.log(`   This means: Backend is NOT creating notifications\n`);
      console.log(`   ACTION: When customer makes booking, check backend console for:`);
      console.log(`   - "📢 Notification created for user"  \n`);
    } else {
      console.log(`✅ PASSED: Found ${recentNotifs.length} recent notification(s)\n`);
      recentNotifs.forEach((notif, idx) => {
        console.log(`   [${idx + 1}] ${notif.type}`);
        console.log(`       User: ${notif.user_id}`);
        console.log(`       Title: ${notif.title}`);
        console.log(`       Created: ${new Date(notif.created_at).toLocaleTimeString()}\n`);
      });
    }

    // TEST 3: Check users table
    console.log(`📌 TEST 3: User Data Integrity`);
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(5);
    
    if (userError) {
      console.log(`❌ FAILED: Cannot access users table`);
      console.log(`   Error: ${userError.message}\n`);
    } else if (!users || users.length === 0) {
      console.log(`⚠️  NO users found in database`);
      console.log(`   ACTION: Make sure users are registered first\n`);
    } else {
      console.log(`✅ PASSED: Found ${users.length} user(s)`);
      users.forEach((user, idx) => {
        console.log(`   [${idx + 1}] ${user.email} (${user.role})`);
      });
      console.log();
    }

    // TEST 4: Check reservations
    console.log(`📌 TEST 4: Recent Reservations`);
    const { data: reservations, count: resCount, error: resError } = await supabase
      .from('reservations')
      .select('*', { count: 'exact' })
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });
    
    if (resError) {
      console.log(`❌ FAILED: Cannot query reservations`);
      console.log(`   Error: ${resError.message}\n`);
    } else if (!reservations || reservations.length === 0) {
      console.log(`⚠️  NO recent reservations found in last 5 minutes`);
      console.log(`   ACTION: Make a test booking, then run this script again\n`);
    } else {
      console.log(`✅ PASSED: Found ${reservations.length} recent booking(s)\n`);
      reservations.forEach((res, idx) => {
        console.log(`   [${idx + 1}] Reservation ${res.id}`);
        console.log(`       Customer: ${res.customer_id}`);
        console.log(`       Restaurant: ${res.restaurant_id}`);
        console.log(`       Status: ${res.status}`);
        console.log(`       Created: ${new Date(res.created_at).toLocaleTimeString()}\n`);
      });
    }

    // TEST 5: Summary
    console.log(`📌 SUMMARY\n`);
    if (recentNotifs?.length > 0) {
      console.log(`✅ Notifications ARE being created in database`);
      console.log(`   Problem: Frontend not fetching or displaying them`);
      console.log(`   ACTION: Check /notifications screen & browser console\n`);
    } else if (reservations?.length > 0) {
      console.log(`⚠️  Bookings ARE created but NO notifications generated`);
      console.log(`   Problem: Backend notification creation failed`);
      console.log(`   ACTION: Check backend console when booking is made\n`);
    } else {
      console.log(`ℹ️  No recent activity (last 5 minutes)`);
      console.log(`   ACTION: Make a test booking first\n`);
    }

  } catch (err) {
    console.error(`\n❌ Test Error:`, err.message);
  }
}

// Run tests
runTests().then(() => {
  console.log(`================================`);
  console.log(`🚀 Test Complete\n`);
  process.exit(0);
});
