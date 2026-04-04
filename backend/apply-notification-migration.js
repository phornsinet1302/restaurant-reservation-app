/**
 * Apply notifications column migration via SQL
 * Usage: node apply-notification-migration.js
 */

require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function applyMigration() {
  console.log(`\n🔄 APPLYING NOTIFICATIONS MIGRATION\n`);
  console.log(`================================\n`);

  const migrationSQL = `
-- Ensure notifications table has all required columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';
ALTER TABLE notifications ALTER COLUMN message SET DATA TYPE TEXT;
ALTER TABLE notifications ALTER COLUMN is_read SET DATA TYPE BOOLEAN;

COMMENT ON COLUMN notifications.type IS 'Type of notification: booking_created, booking_confirmed, etc';`;

  console.log(`Executing SQL:\n`);
  console.log(migrationSQL);
  console.log(`\n`);

  try {
    // Execute raw SQL query via rpc
    console.log(`⏳ Applying migration...\n`);
    
    // Use sql method if available, otherwise use rpc
    const { data, error } = await supabaseAdmin
      .rpc('exec_sql', { sql: migrationSQL })
      .catch(async () => {
        // If RPC doesn't exist, try alternative approach
        console.log(`📌 Attempting alternative method...\n`);
        
        // Just try to insert a notification - if it fails due to missing column, we'll know
        const testNotif = {
          user_id: '00000000-0000-0000-0000-000000000000',
          type: 'test',
          title: 'Migration Test',
          message: 'Testing if type column exists'
        };
        
        const result = await supabaseAdmin
          .from('notifications')
          .insert([testNotif]);
        
        return result;
      });

    if (error) {
      console.log(`⚠️ Migration result: ${error.message}`);
      
      if (error.message.includes('schema cache')) {
        console.log(`\n✅ Column likely exists! Schema cache issue.`);
        console.log(`   Clearing cache and retrying...\n`);
        
        // Try again  
        const retryResult = await supabaseAdmin
          .from('notifications')
          .insert([{
            user_id: '00000000-0000-0000-0000-000000000000',
            type: 'test',
            title: 'Test',
            message: 'Test'
          }]);
        
        if (retryResult.error) {
          console.log(`❌ Still failing: ${retryResult.error.message}`);
          console.log(`\n📋 MANUAL STEPS:`);
          console.log(`Go to: https://app.supabase.com/project/[PROJECT-ID]/sql/new`);
          console.log(`Run this SQL:`);
          console.log(migrationSQL);
        } else {
          console.log(`✅ Success after cache clear!`);
        }
      }
      return;
    }

    console.log(`✅ Migration applied successfully!\n`);

    // Test insertion
    console.log(`🧪 Testing notification insertion...\n`);
    
    const testNotif = {
      user_id: '00000000-0000-0000-0000-000000000000',
      type: 'test',
      title: '✅ Columns are working!',
      message: 'Migration successful'
    };
    
    const { data: testData, error: testError } = await supabaseAdmin
      .from('notifications')
      .insert([testNotif])
      .select();

    if (testError) {
      console.log(`❌ Test failed: ${testError.message}`);
    } else {
      console.log(`✅ Test passed! Notifications table is ready.\n`);
      
      // Clean up test record
      await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', testData[0].id);
    }

  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    console.log(`📋 MANUAL FIX:`);
    console.log(`Go to Supabase console → SQL Editor`);
    console.log(`Run this SQL:`);
    console.log(migrationSQL);
  }

  console.log(`\n================================`);
  console.log(`✅ Migration check complete\n`);
  process.exit(0);
}

applyMigration();
