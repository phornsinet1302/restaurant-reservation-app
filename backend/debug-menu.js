// Load environment variables FIRST
require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });

const supabase = require('./config/supabase');
const supabaseAdmin = require('./config/supabase').supabaseAdmin;

async function debugMenuItems() {
  try {
    console.log('🔍 Debugging Menu Items...\n');

    // Get all menu items
    console.log('📋 Fetching ALL menu items from database...');
    const { data: allMenus, error: allError } = await supabase
      .from('menu_items')
      .select('*');

    if (allError) {
      console.error('❌ Error fetching all menus:', allError);
      return;
    }

    console.log(`✅ Found ${allMenus?.length || 0} total menu items\n`);

    if (allMenus && allMenus.length > 0) {
      console.log('📊 Menu Items by Restaurant:');
      const byRestaurant = {};
      allMenus.forEach(item => {
        if (!byRestaurant[item.restaurant_id]) {
          byRestaurant[item.restaurant_id] = [];
        }
        byRestaurant[item.restaurant_id].push(item);
      });

      Object.entries(byRestaurant).forEach(([restId, items]) => {
        console.log(`\n  Restaurant: ${restId}`);
        console.log(`  Items: ${items.length}`);
        items.forEach((item, idx) => {
          console.log(`    ${idx + 1}. ${item.name} (${item.category}) - $${item.price}`);
          console.log(`       ID: ${item.id}`);
          console.log(`       Available: ${item.is_available}`);
          console.log(`       Image: ${item.image_url ? '✓' : '✗'}`);
        });
      });

      // Now test the API endpoint for each restaurant
      console.log('\n\n🧪 Testing API Endpoint Response:');
      for (const [restId, items] of Object.entries(byRestaurant)) {
        console.log(`\n  Testing /api/restaurants/${restId}`);
        
        const { data: detail, error: detailError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restId)
          .single();

        if (detailError) {
          console.log(`  ❌ Restaurant not found: ${detailError.message}`);
          continue;
        }

        // Fetch menu items for this restaurant
        const { data: menuItems, error: menuError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restId)
          .eq('is_available', true)
          .order('category', { ascending: true });

        console.log(`  ✅ Menu items returned: ${menuItems?.length || 0}`);
        if (menuItems && menuItems.length > 0) {
          menuItems.forEach(item => {
            console.log(`     - ${item.name} (${item.category})`);
          });
        }

        // Show what the full response would look like
        const responseData = {
          ...detail,
          menu_items: menuItems || []
        };
        console.log(`  Response structure: ${JSON.stringify(Object.keys(responseData))}`);
      }
    } else {
      console.log('⚠️  No menu items found in database!');
      console.log('    Please add menu items from the merchant menu screen first.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

debugMenuItems();
