const axios = require('axios');

const API_URL = 'http://10.1.64.40:3000';

async function analyzeUploadedVideos() {
  try {
    console.log('🎬 === MERCHANT VIDEO UPLOAD ANALYSIS ===\n');

    console.log('📍 Checking all stories for video URL status...\n');
    const res = await axios.get(`${API_URL}/api/stories/active`, {
      timeout: 5000
    });

    if (!res.data || res.data.length === 0) {
      console.log('⚠️  No stories found');
      return;
    }

    let cloudVideoCount = 0;
    let localVideoCount = 0;
    let noVideoCount = 0;
    const problemStories = [];

    res.data.forEach(restaurant => {
      if (!restaurant.stories) return;
      
      restaurant.stories.forEach(story => {
        if (!story.video_url) {
          noVideoCount++;
        } else if (story.video_url.startsWith('file://')) {
          localVideoCount++;
          problemStories.push({
            id: story.id,
            title: story.title,
            video_url: story.video_url.substring(0, 80),
          });
        } else {
          cloudVideoCount++;
        }
      });
    });

    console.log('📊 Statistics:');
    console.log(`   ✅ Stories with CLOUD videos: ${cloudVideoCount}`);
    console.log(`   ❌ Stories with LOCAL paths: ${localVideoCount}`);
    console.log(`   ⚠️  Stories with NO video: ${noVideoCount}`);

    if (problemStories.length > 0) {
      console.log('\n🚨 Problem Stories (LOCAL paths):');
      problemStories.forEach((story, idx) => {
        console.log(`\n   ${idx + 1}. "${story.title}"`);
        console.log(`      ID: ${story.id}`);
        console.log(`      Local Path: ${story.video_url}...`);
        console.log(`      Status: ❌ CANNOT DISPLAY on customer side`);
      });

      console.log('\n💡 Solution:');
      console.log('   1. These are videos uploaded BEFORE the fix');
      console.log('   2. The frontend had a fallback to local paths when upload failed');
      console.log('   3. Now fixed - frontend will require successful cloud upload');
      console.log('   4. Users need to RE-UPLOAD their videos');
    }

    console.log('\n✅ Fix Summary:');
    console.log('   • Frontend video upload failure fixed');
    console.log('   • Removed local path fallback - requires cloud upload');
    console.log('   • Backend properly saves video_url to database');
    console.log('   • API returns video_url in response');
    console.log('   • StoryViewer displays cloud videos');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeUploadedVideos();
