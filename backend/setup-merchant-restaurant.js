// Quick setup script to create a test restaurant for a merchant
require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });
const { supabaseAdmin } = require('./config/supabase');

async function setupMerchantRestaurant() {
  try {
    console.log('🔍 Looking for a merchant with role "merchant"...');
    
    // Find a merchant user
    let merchants = [];
    const { data: existingMerchants, error: merchantErr } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('role', 'merchant')
      .limit(1);

    merchants = existingMerchants || [];

    // If no merchant exists in database, try to create one
    if ((!merchants || merchants.length === 0)) {
      console.log('⚠️  No merchant profile found. Checking for existing auth user...');
      
      let authUserId = null;
      
      // First, check if merchant@test.com already exists in auth
      const { data: existingAuth, error: authSearchError } = await supabaseAdmin.auth.admin.listUsers();
      const merchantAuth = existingAuth?.users?.find(u => u.email === 'merchant@test.com');
      
      if (merchantAuth) {
        console.log('✅ Found existing auth user for merchant@test.com');
        authUserId = merchantAuth.id;
      } else {
        console.log('📝 Creating auth user for merchant@test.com...');
        // Create merchant via Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: 'merchant@test.com',
          password: 'TestMerchant123!',
          email_confirm: true,
        });

        if (authError) {
          console.error('❌ Error creating auth user:', authError.message);
          return;
        }
        authUserId = authData.user.id;
        console.log(`✅ Auth user created (ID: ${authUserId})`);
      }

      // Now create merchant user profile with correct schema
      const { data: newMerchant, error: profileErr } = await supabaseAdmin
        .from('users')
        .insert([{
          id: authUserId,
          email: 'merchant@test.com',
          name: 'Test Merchant',
          role: 'merchant',
        }])
        .select();

      if (profileErr) {
        // If the error is "duplicate key", the profile already exists
        if (profileErr.message.includes('duplicate') || profileErr.message.includes('Duplicate')) {
          console.log('✅ Merchant profile already exists');
          merchants = [{ id: authUserId, email: 'merchant@test.com', name: 'Test Merchant', role: 'merchant' }];
        } else {
          console.error('❌ Error creating merchant profile:', profileErr.message);
          return;
        }
      } else {
        merchants = newMerchant;
        console.log(`✅ Merchant profile created: merchant@test.com (ID: ${authUserId})`);
      }
    }

    const merchant = merchants[0];
    console.log(`✅ Found merchant: ${merchant.email} (ID: ${merchant.id})`);

    // Check if merchant already has a restaurant
    const { data: existingRestaurant } = await supabaseAdmin
      .from('restaurants')
      .select('id, name')
      .eq('merchant_id', merchant.id)
      .single();

    if (existingRestaurant) {
      console.log(`✅ Merchant already has restaurant: ${existingRestaurant.name} (ID: ${existingRestaurant.id})`);
      console.log('No need to create a new one.');
      return;
    }

    // Create a restaurant for the merchant
    console.log('\n📝 Creating restaurant for merchant...');
    
    const restaurantData = {
      merchant_id: merchant.id,
      name: `${merchant.name || 'My'} Restaurant`,
      description: 'A great restaurant with delicious food',
      address: '123 Main Street, London',
      phone: '+44 20 1234 5678',
      latitude: 51.5074,
      longitude: -0.1278,
      opening_hours: '10:00-22:00',
      cuisine: 'International',
      category: 'Restaurant',
      is_published: false,
      image_url: null,
    };

    const { data: newRestaurant, error: createErr } = await supabaseAdmin
      .from('restaurants')
      .insert([restaurantData])
      .select();

    if (createErr) {
      console.error('❌ Error creating restaurant:', createErr.message);
      return;
    }

    console.log(`✅ Restaurant created successfully!`);
    console.log(`   ID: ${newRestaurant[0].id}`);
    console.log(`   Name: ${newRestaurant[0].name}`);
    console.log(`   Merchant: ${merchant.email}`);
    console.log('\n💡 The merchant can now access their dashboard!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupMerchantRestaurant();
