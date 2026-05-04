const { supabaseAdmin } = require('./config/supabase');

const merchantId = '19df1b44-fb48-4c80-a5a9-7ff731d94050';

async function checkRestaurants() {
  try {
    console.log(`\n🔍 Checking restaurants for merchant: ${merchantId}\n`);
    
    // Get all restaurants for this merchant
    const { data: restaurants, error } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, merchant_id, is_published, phone')
      .eq('merchant_id', merchantId);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!restaurants || restaurants.length === 0) {
      console.log('⚠️  No restaurants found for this merchant');
      
      // Check if there are ANY restaurants at all
      const { data: allRestaurants, error: allError } = await supabaseAdmin
        .from('restaurants')
        .select('id, name, merchant_id, is_published, phone')
        .limit(10);
      
      console.log('\n📊 First 10 restaurants in database:');
      if (allError) {
        console.error('Error fetching all restaurants:', allError.message);
      } else {
        allRestaurants.forEach(r => {
          console.log(`   • ${r.name} (merchant: ${r.merchant_id.substring(0, 8)}..., published: ${r.is_published})`);
        });
      }
      return;
    }
    
    console.log(`✅ Found ${restaurants.length} restaurant(s):\n`);
    restaurants.forEach(r => {
      console.log(`   📍 ${r.name}`);
      console.log(`      ID: ${r.id}`);
      console.log(`      Published: ${r.is_published ? '✅ YES' : '❌ NO'}`);
      console.log(`      Phone: ${r.phone || 'N/A'}\n`);
    });
    
    // Check stories for each restaurant
    for (const restaurant of restaurants) {
      const { data: stories, error: storiesError } = await supabaseAdmin
        .from('stories')
        .select('id, created_at, expires_at')
        .eq('restaurant_id', restaurant.id);
      
      if (!storiesError) {
        console.log(`   📖 Stories: ${stories.length} story/stories\n`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRestaurants();
