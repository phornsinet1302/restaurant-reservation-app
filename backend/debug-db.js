require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('\n🔍 CHECKING DATABASE...\n');
  
  try {
    // Get all users
    console.log('📋 Fetching all users from database...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role');

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
      return;
    }

    console.log(`✅ Found ${users?.length || 0} users in database:\n`);
    
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No users found in database!\n');
    }

    // Check if liig03170@gmail.com exists
    console.log('🔎 Searching for liig03170@gmail.com...');
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', 'liig03170@gmail.com');

    if (targetError) {
      console.log('❌ Error:', targetError.message);
    } else if (targetUser && targetUser.length > 0) {
      console.log('✅ User found:', targetUser[0]);
    } else {
      console.log('❌ User NOT found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkDatabase();
