require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function cleanupOldStories() {
  try {
    console.log('🧹 Cleaning up old stories with local file paths...\n');

    // Get all stories with local file paths
    const { data: stories, error: selectError } = await supabaseAdmin
      .from('stories')
      .select('id, title')
      .or("image_url.like.file://%, video_url.like.file://%");

    if (selectError) {
      console.error('❌ Error selecting stories:', selectError);
      return;
    }

    if (stories.length === 0) {
      console.log('✅ No old stories found with local paths');
      return;
    }

    console.log(`Found ${stories.length} old stories to delete:\n`);
    stories.forEach((s, i) => {
      console.log(`  ${i + 1}. "${s.title}" (${s.id})`);
    });

    // Delete them
    const { error: deleteError } = await supabaseAdmin
      .from('stories')
      .delete()
      .or("image_url.like.file://%, video_url.like.file://%");

    if (deleteError) {
      console.error('❌ Error deleting stories:', deleteError);
      return;
    }

    console.log(`\n✅ Deleted ${stories.length} old stories with local file paths`);
    console.log('\n📝 Next steps:');
    console.log('   1. Open the app');
    console.log('   2. Go to Manage Stories');
    console.log('   3. Upload fresh stories');
    console.log('   4. Videos will now upload to cloud storage! 🎥');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanupOldStories();
