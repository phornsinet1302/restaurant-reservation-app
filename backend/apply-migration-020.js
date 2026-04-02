const fs = require('fs');
const path = require('path');

async function showMigrationInstructions() {
  try {
    console.log('🔧 Migration: Add image_url column to restaurants table\n');

    const migrationPath = path.join(__dirname, '../database/migrations/020_add_image_url_to_restaurants.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 SQL to execute:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));

    console.log('\n\n📋 MANUAL EXECUTION STEPS:\n');
    console.log('1. Go to: https://app.supabase.com');
    console.log('2. Select your project (restaurant-reservation-app)');
    console.log('3. Click "SQL Editor" in left sidebar');
    console.log('4. Click "+ New query" button');
    console.log('5. Paste the SQL above');
    console.log('6. Click the "Run" button (or press Cmd+Enter)');
    console.log('\n✅ After executing the SQL, close the file and try publishing again!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

showMigrationInstructions();
