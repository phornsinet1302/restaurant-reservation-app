require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function checkTimezone() {
  try {
    console.log('🕐 Checking timezone and timestamp handling...\n');

    // Get current server time
    const now = new Date();
    console.log('📍 Server Information:');
    console.log('   Current time:', now.toISOString());
    console.log('   Unix timestamp:', now.getTime());
    console.log('   Timezone offset (ms):', now.getTimezoneOffset() * 60 * 1000);
    console.log('   Timezone offset (hours):', now.getTimezoneOffset() / 60);
    
    // Cambodia is UTC+7
    const cambodiaOffset = 7 * 60; // UTC+7 in minutes
    const serverOffset = now.getTimezoneOffset(); // negative for UTC+
    const diff = cambodiaOffset + serverOffset;
    console.log('\n🇰🇭 Cambodia Information:');
    console.log('   Cambodia timezone: UTC+7');
    console.log('   Cambodia offset (minutes): +420');
    console.log('   Difference from server:', diff, 'minutes');

    // Check recent stories
    console.log('\n📖 Recent stories timestamps:');
    const { data: stories, error } = await supabaseAdmin
      .from('stories')
      .select('id, title, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    stories.forEach((story, i) => {
      const created = new Date(story.created_at);
      const expires = new Date(story.expires_at);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      console.log(`\n   Story ${i + 1}: "${story.title}"`);
      console.log(`     Created: ${story.created_at}`);
      console.log(`     Hours ago: ${diffHours.toFixed(2)}`);
      console.log(`     Expires at: ${story.expires_at}`);
      console.log(`     Expired: ${expires < now}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTimezone();
