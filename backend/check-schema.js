/**
 * Check notifications table schema
 */

require('dotenv').config();
const { supabaseAdmin } = require('./config/supabase');

async function checkSchema() {
  console.log(`\nChecking notifications table schema...\n`);
  
  try {
    // Get table info by trying to select and catching error
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`Error: ${error.message}\n`);
      return;
    }

    if (data && data.length > 0) {
      console.log(`Current columns in notifications table:`);
      Object.keys(data[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
    } else {
      console.log(`Table is empty, checking via create attempt...`);
    }

    // Try to get table info directly from information schema
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .rpc('get_table_columns', {
        table_name: 'notifications'
      }).catch(() => ({ data: null, error: 'RPC not available' }));

    if (tableError) {
      console.log(`\nAlternate approach - checking schema via SQL:`);
      console.log(`Try running directly in Supabase SQL Editor:
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position;`);
    }

  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

checkSchema().then(() => process.exit(0));
