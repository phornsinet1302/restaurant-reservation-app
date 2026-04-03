const { supabaseAdmin } = require('./config/supabase');

async function cleanupLocalVideoPaths() {
  try {
    console.log('🧹 === CLEANUP LOCAL VIDEO PATHS ===\n');

    // Find all stories with local video paths
    console.log('1️⃣  Finding stories with local video paths...');
    const { data: stories, error: fetchError } = await supabaseAdmin
      .from('stories')
      .select('id, video_url, title, restaurant_id, image_url')
      .not('video_url', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching stories:', fetchError.message);
      return;
    }

    const localPathStories = stories.filter(s => 
      s.video_url && s.video_url.startsWith('file://')
    );

    console.log(`   Total stories with video_url: ${stories.length}`);
    console.log(`   Stories with LOCAL paths: ${localPathStories.length}`);

    if (localPathStories.length === 0) {
      console.log('✅ No local video paths found - all good!');
      return;
    }

    // Show the stories
    console.log('\n2️⃣  Local video path stories:');
    localPathStories.forEach((story, idx) => {
      console.log(`\n   ${idx + 1}. "${story.title}"`);
      console.log(`      ID: ${story.id}`);
      console.log(`      Video URL: ${story.video_url.substring(0, 80)}...`);
      console.log(`      Image URL: ${story.image_url ? story.image_url.substring(0, 60) + '...' : 'none'}`);
    });

    // Option: Remove video_url from stories with local paths
    console.log('\n3️⃣  Removing invalid local video paths...');
    for (const story of localPathStories) {
      const { error: updateError } = await supabaseAdmin
        .from('stories')
        .update({ video_url: null })
        .eq('id', story.id);

      if (updateError) {
        console.error(`   ❌ Failed to update ${story.id}:`, updateError.message);
      } else {
        console.log(`   ✅ Updated story "${story.title}" - video_url removed`);
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log('   Users need to re-upload videos using the fixed app');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanupLocalVideoPaths();
