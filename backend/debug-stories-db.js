require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function debugStories() {
  try {
    console.log('🔍 Debugging stories in database...\n');

    const { data: stories, error } = await supabaseAdmin
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`Found ${stories.length} stories:\n`);
    
    stories.forEach((story, i) => {
      console.log(`Story ${i + 1}:`);
      console.log(`  ID: ${story.id}`);
      console.log(`  Image URL: ${story.image_url ? story.image_url.substring(0, 80) + '...' : 'null'}`);
      console.log(`  Video URL: ${story.video_url ? story.video_url.substring(0, 80) + '...' : 'null'}`);
      console.log(`  Title: ${story.title}`);
      console.log(`  Created: ${story.created_at}`);
      console.log('');
    });

    // Check if any stories have local file paths
    const localPathStories = stories.filter(s => s.image_url && s.image_url.startsWith('file://'));
    if (localPathStories.length > 0) {
      console.log(`⚠️  Found ${localPathStories.length} stories with LOCAL FILE PATHS`);
      console.log('   These need to be re-uploaded to use cloud storage\n');
    }

    // Check if any stories have missing video URLs
    const missingVideoUrl = stories.filter(s => !s.video_url);
    if (missingVideoUrl.length > 0) {
      console.log(`⚠️  Found ${missingVideoUrl.length} stories WITHOUT video_url`);
      console.log('   These will be treated as image stories\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugStories();
