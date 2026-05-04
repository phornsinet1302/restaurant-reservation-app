// Debug script to diagnose password issues
require('dotenv').config();

console.log('\n' + '='.repeat(70));
console.log('🔑 PASSWORD VERIFICATION DIAGNOSTIC');
console.log('='.repeat(70));

const bcrypt = require('bcrypt');

// Test 1: Bcrypt functionality
console.log('\n1️⃣  BCRYPT TEST:');
console.log('   Testing bcrypt hashing and comparison...');

const testPassword = 'TestPassword123';
console.log('   Original password:', testPassword);

bcrypt.hash(testPassword, 10).then(hashedDirect => {
  console.log('   Hashed:', hashedDirect.substring(0, 40) + '...');
  
  bcrypt.compare(testPassword, hashedDirect).then(matched => {
    console.log('   Comparison result (should be true):', matched ? '✅ MATCH' : '❌ NO MATCH');
    
    // Wrong password test
    bcrypt.compare('WrongPassword', hashedDirect).then(wrongMatch => {
      console.log('   Wrong password test (should be false):', wrongMatch ? '❌ MATCH' : '✅ NO MATCH');
      
      // Test 2: Check database
      console.log('\n2️⃣  DATABASE PASSWORD CHECK:');
      testDatabasePasswords();
    });
  });
});

async function testDatabasePasswords() {
  try {
    const supabase = require('./config/supabase');
    
    console.log('   Querying users table for password_hash column...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .limit(5);
    
    if (error) {
      console.error('   ❌ Query error:', error.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('   ❌ No users found in database');
      return;
    }
    
    console.log(`   ✅ Found ${users.length} users`);
    
    users.forEach((user, i) => {
      console.log(`\n   User ${i + 1}:`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Has password_hash:`, user.password_hash ? 'YES (' + user.password_hash.substring(0, 40) + '...)' : 'NO - ❌ PROBLEM!');
      
      if (user.password_hash) {
        // Try to verify with bcrypt
        bcrypt.compare('test', user.password_hash).then(result => {
          console.log(`     Bcrypt hash format: ✅ Valid (comparison succeeded)`);
        }).catch(err => {
          console.log(`     Bcrypt hash format: ❌ Invalid! Error: ${err.message}`);
        });
      }
    });
    
    testLoginFlow();
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

async function testLoginFlow() {
  console.log('\n3️⃣  LOGIN FLOW SIMULATION:');
  
  try {
    const supabase = require('./config/supabase');
    
    // Get first user
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .limit(1);
    
    if (error || !users || users.length === 0) {
      console.log('   ❌ No users to test');
      return;
    }
    
    const user = users[0];
    console.log('   Testing with user:', user.email);
    
    if (!user.password_hash) {
      console.log('   ❌ CRITICAL: User has no password_hash!');
      console.log('   This is why login fails - passwords not stored');
      return;
    }
    
    // Try with test password
    const testResult = await bcrypt.compare('test', user.password_hash);
    console.log('   Bcrypt compare executed:', testResult ? 'matched' : 'no match');
    
  } catch (err) {
    console.error('   Error in login test:', err.message);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 RECOMMENDATIONS:');
  console.log('='.repeat(70));
  console.log('\n✅ If ALL tests pass:');
  console.log('   - Bcrypt is working correctly');
  console.log('   - Passwords are stored in database');
  console.log('   - Login should work');
  console.log('   → Check if old passwords are still valid');
  console.log('   → Try registering a NEW account');
  console.log('\n❌ If password_hash is NULL for all users:');
  console.log('   - Passwords were never saved to database');
  console.log('   - Check if database UPDATE is being blocked by RLS');
  console.log('   - All users need to RESET PASSWORD to fix');
  console.log('\n❌ If bcrypt format is invalid:');
  console.log('   - Password hashes are corrupted');
  console.log('   - All users need to reset password');
  console.log('='.repeat(70) + '\n');
}
