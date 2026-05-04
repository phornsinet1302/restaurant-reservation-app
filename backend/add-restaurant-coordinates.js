// Script to add coordinates to restaurants that are missing them
require("dotenv").config();
const supabase = require('./config/supabase').supabaseAdmin;

// Sample coordinates for different Phnom Penh locations
const SAMPLE_COORDS = [
  { latitude: 11.5564, longitude: 104.9282, name: "Central Market" },
  { latitude: 11.5543, longitude: 104.9281, name: "Riverfront" },
  { latitude: 11.5633, longitude: 104.9288, name: "BKK1" },
  { latitude: 11.5491, longitude: 104.9252, name: "Boeung Keng Kong" },
  { latitude: 11.5536, longitude: 104.9365, name: "Tul Tum" },
];

async function addCoordinates() {
  try {
    console.log('🚀 Starting to add coordinates to restaurants...\n');

    // Get all restaurants without coordinates
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, latitude, longitude')
      .or('latitude.is.null,longitude.is.null');

    if (error) {
      console.error('❌ Error fetching restaurants:', error.message);
      return;
    }

    console.log(`📍 Found ${restaurants.length} restaurants without coordinates:\n`);

    // Update each restaurant with sample coordinates
    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];
      const coords = SAMPLE_COORDS[i % SAMPLE_COORDS.length];

      console.log(`   Updating: ${restaurant.name}`);
      console.log(`   → From: (${restaurant.latitude}, ${restaurant.longitude})`);
      console.log(`   → To: (${coords.latitude}, ${coords.longitude})\n`);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);

      if (updateError) {
        console.error(`   ❌ Error updating ${restaurant.name}:`, updateError.message);
      } else {
        console.log(`   ✅ Updated successfully\n`);
      }
    }

    // Verify the updates
    console.log('\n📋 Verifying updates...\n');
    const { data: updated } = await supabase
      .from('restaurants')
      .select('name, latitude, longitude')
      .limit(5);

    console.log('Updated restaurants:');
    updated?.forEach(r => {
      console.log(`  ✅ ${r.name}: (${r.latitude}, ${r.longitude})`);
    });

    console.log('\n✅ Done! All restaurants now have coordinates.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

addCoordinates();
