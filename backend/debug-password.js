require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPassword() {
  console.log('\n🔍 CHECKING PASSWORD STATUS...\n');
  
  try {
    const email = 'liig03170@gmail.com';
    
    // Get the most recent user (by ID)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email);

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    console.log(`✅ Found ${users.length} users with email: ${email}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password Hash: ${user.password_hash ? 'SET ✅' : 'NOT SET ❌'}`);
      if (user.password_hash) {
        console.log(`   Hash Length: ${user.password_hash.length}`);
        console.log(`   Hash Preview: ${user.password_hash.substring(0, 20)}...`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkPassword();
