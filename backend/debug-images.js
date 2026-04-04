require('dotenv').config({ path: '.env' });
const supabase = require('./config/supabase');
const { supabaseAdmin } = require('./config/supabase');

async function debugImages() {
  try {
    console.log('\n🔍 ===== DEBUG RESTAURANT IMAGES =====\n');

    // Get all restaurants
    console.log('📋 Fetching all restaurants...');
    const { data: restaurants, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name, image_url, merchant_id, is_published')
      .order('name');

    if (restErr) throw restErr;

    console.log(`✅ Found ${restaurants.length} restaurants:\n`);
    
    restaurants.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.name}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   Image URL: ${r.image_url ? '✅ ' + r.image_url : '❌ (NULL)'}`);
      console.log(`   Published: ${r.is_published ? 'Yes' : 'No'}`);
      console.log('');
    });

    // List files in restaurant-media storage
    console.log('\n📁 Files in Supabase Storage (restaurant-media bucket):\n');
    const { data: files, error: storageErr } = await supabaseAdmin.storage
      .from('restaurant-media')
      .list();

    if (storageErr) {
      console.log('⚠️  Could not list storage files:', storageErr.message);
    } else if (files && files.length > 0) {
      console.log(`Found ${files.length} files:`);
      files.forEach((file) => {
        console.log(`  - ${file.name}`);
      });
    } else {
      console.log('No files in restaurant-media bucket');
    }

    console.log('\n✅ Debug complete!\n');
    console.log('💡 If some restaurants have NULL image_url:');
    console.log('   Run: curl -X POST http://localhost:3000/api/restaurants/admin/set-image-url');
    console.log('   With: {"restaurantId":"<id>", "imageUrl":"<url>"}');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugImages();
