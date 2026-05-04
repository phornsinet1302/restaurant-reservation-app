const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('🔄 Applying migration 019_add_video_support_to_stories...\n');
    
    // Get the SQL command from the migration file
    const migrationSQL = `
      ALTER TABLE stories ADD COLUMN IF NOT EXISTS video_url TEXT;
      COMMENT ON COLUMN stories.video_url IS 'Optional video URL for story video content';
    `;
    
    // For Supabase, we need to execute this via RPC or direct SQL
    // Since we don't have direct SQL execution, we'll use a different approach
    // Let's check if the column exists first
    console.log('✅ Migration SQL prepared');
    console.log('📝 To apply this migration to your Supabase database:');
    console.log('');
    console.log('1. Go to: https://app.supabase.com/project/[your-project-id]/sql');
    console.log('2. Paste this SQL:');
    console.log('');
    console.log('   ALTER TABLE stories ADD COLUMN IF NOT EXISTS video_url TEXT;');
    console.log('');
    console.log('3. Click "Run"');
    console.log('');
    console.log('Alternatively, use the Supabase CLI:');
    console.log('   supabase db push');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
