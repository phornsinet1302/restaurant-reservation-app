const axios = require('axios');

const restaurantId = '433b5f9c-c70f-4f91-90a1-dad49634f133';

async function testVideoSupport() {
  try {
    console.log('🎥 Testing video support...\n');
    
    // Test 1: Check if API is returning stories with video_url field
    console.log('Test 1: Fetch stories endpoint');
    const response = await axios.get(`http://localhost:3000/api/stories/restaurant/${restaurantId}`);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Got ${response.data.length} stories\n`);
      
      response.data.forEach((story, index) => {
        console.log(`Story ${index + 1}:`);
        console.log(`  ID: ${story.id}`);
        console.log(`  Title: ${story.title}`);
        console.log(`  Image URL: ${story.image_url ? story.image_url.substring(0, 60) + '...' : 'N/A'}`);
        console.log(`  Video URL: ${story.video_url ? story.video_url.substring(0, 60) + '...' : 'Not set'}`);
        console.log(`  Created: ${story.created_at}`);
        console.log(`  Expires: ${story.expires_at}`);
        console.log('');
      });
      
      // Check if any stories have video_url
      const videosStories = response.data.filter(s => s.video_url);
      if (videosStories.length > 0) {
        console.log(`✅ Found ${videosStories.length} video stories!`);
      } else {
        console.log(`⚠️  No video stories yet. You can test by uploading a story with video from the app.`);
      }
    } else {
      console.log('❌ Unexpected response format:', response.data);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

testVideoSupport();
