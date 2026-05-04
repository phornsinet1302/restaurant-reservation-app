const axios = require('axios');

const API_URL = 'http://10.1.64.40:3000';

async function testStoriesStructure() {
  try {
    console.log('🔍 === DETAILED STORIES STRUCTURE TEST ===\n');

    console.log('📍 Fetching /api/stories/active...');
    const res = await axios.get(`${API_URL}/api/stories/active`, {
      timeout: 5000
    });

    console.log('✅ Response received');
    console.log(`   Total restaurants: ${res.data.length}`);

    if (res.data.length > 0) {
      const restaurant = res.data[0];
      console.log('\n🏪 First restaurant:');
      console.log(`   ID: ${restaurant.id}`);
      console.log(`   Name: ${restaurant.name}`);
      console.log(`   Phone: ${restaurant.phone}`);
      console.log(`   Stories count: ${restaurant.stories?.length || 0}`);

      if (restaurant.stories && restaurant.stories.length > 0) {
        const story = restaurant.stories[0];
        console.log('\n📖 First story object:');
        console.log('   Keys:', Object.keys(story).join(', '));
        
        console.log('\n   Full story data:');
        Object.keys(story).forEach(key => {
          const value = story[key];
          if (typeof value === 'string' && value.length > 100) {
            console.log(`     ${key}: "${value.substring(0, 80)}..."`);
          } else {
            console.log(`     ${key}: ${JSON.stringify(value)}`);
          }
        });

        // Check video_url specifically
        console.log('\n🎥 Video URL Analysis:');
        if (story.video_url) {
          const isCloud = !story.video_url.startsWith('file://');
          const status = isCloud ? '✅ CLOUD URL' : '❌ LOCAL PATH';
          console.log(`   Status: ${status}`);
          console.log(`   Value: ${story.video_url.substring(0, 100)}...`);
        } else {
          console.log('   Status: ⚠️ NO VIDEO URL FIELD');
        }
      }
    } else {
      console.log('⚠️  No restaurants returned');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
  }
}

testStoriesStructure();
