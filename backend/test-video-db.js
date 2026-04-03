const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://10.1.64.40:3000';

async function testVideoFlow() {
  try {
    console.log('🎥 === VIDEO UPLOAD TEST ===\n');

    // Test 1: Check if video upload endpoint exists
    console.log('1️⃣  Checking if /api/media/upload-video endpoint is responding...');
    try {
      const testRes = await axios.post(`${API_URL}/api/media/upload-video`, {}, {
        timeout: 3000
      }).catch(e => {
        // Expected to fail since no file, but endpoint should exist
        if (e.response?.status === 400 || e.response?.status === 401 || e.code === 'ECONNREFUSED') {
          return e;
        }
        throw e;
      });
      
      if (testRes.code === 'ECONNREFUSED') {
        console.error('❌ Cannot connect to backend at', API_URL);
        return;
      }
      
      console.log('✅ Endpoint is responding (got', testRes.status || testRes.code, ')');
    } catch (e) {
      console.error('❌ Error:', e.message);
      return;
    }

    // Test 2: Check database structure
    console.log('\n2️⃣  Checking if stories table has video_url column...');
    try {
      // Try to read from the database verification
      const supabase = require('./config/supabase').supabaseAdmin;
      const { data: stories, error } = await supabase
        .from('stories')
        .select('*')
        .limit(1);

      if (error) {
        console.error('❌ Database error:', error.message);
        return;
      }

      if (stories && stories.length > 0) {
        const columns = Object.keys(stories[0]);
        if (columns.includes('video_url')) {
          console.log('✅ video_url column exists');
          console.log('   Columns:', columns.join(', '));
        } else {
          console.log('❌ video_url column NOT found');
          console.log('   Available columns:', columns.join(', '));
        }
      } else {
        console.log('⚠️  No stories to check, but column should exist if table was migrated');
      }
    } catch (e) {
      console.error('❌ Error:', e.message);
    }

    // Test 3: Check recent stories for video URLs
    console.log('\n3️⃣  Checking recent stories in database for video_url values...');
    try {
      const supabase = require('./config/supabase').supabaseAdmin;
      const { data: stories, error } = await supabase
        .from('stories')
        .select('id, title, video_url, image_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error:', error.message);
        return;
      }

      if (stories && stories.length > 0) {
        console.log(`✅ Found ${stories.length} recent stories:`);
        stories.forEach((story, idx) => {
          const hasVideo = story.video_url && !story.video_url.startsWith('file://');
          const videoStatus = story.video_url 
            ? (hasVideo ? '✅ CLOUD URL' : '❌ LOCAL PATH')
            : '⚠️ NO VIDEO';
          
          console.log(`\n   Story ${idx + 1}:`);
          console.log(`     ID: ${story.id}`);
          console.log(`     Title: ${story.title}`);
          console.log(`     Video: ${videoStatus}`);
          if (story.video_url) {
            console.log(`     URL: ${story.video_url.substring(0, 80)}...`);
          }
        });
      } else {
        console.log('⚠️  No stories found in database');
      }
    } catch (e) {
      console.error('❌ Error:', e.message);
    }

    // Test 4: Verify API returns video_url
    console.log('\n4️⃣  Checking if /api/stories/active returns video_url...');
    try {
      const res = await axios.get(`${API_URL}/api/stories/active`, {
        timeout: 5000
      }).catch(e => {
        if (e.response) return e.response;
        throw e;
      });

      if (res.data && res.data.length > 0) {
        const story = res.data[0];
        const hasVideo = story.video_url || story.video_url;
        const columns = Object.keys(story);
        
        console.log(`✅ API returned ${res.data.length} stories`);
        console.log(`   First story columns: ${columns.join(', ')}`);
        console.log(`   Has video_url field: ${columns.includes('video_url') ? '✅ YES' : '❌ NO'}`);
        
        if (story.video_url) {
          const videoType = story.video_url.startsWith('file://') ? '❌ LOCAL' : '✅ CLOUD';
          console.log(`   Video status: ${videoType}`);
          console.log(`   Video URL: ${story.video_url.substring(0, 80)}...`);
        }
      } else {
        console.log('⚠️  No stories returned from API');
      }
    } catch (e) {
      console.error('❌ Error:', e.message);
    }

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

testVideoFlow();
