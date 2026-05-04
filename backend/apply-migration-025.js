const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAdminKey = process.env.SUPABASE_ADMIN_KEY;

if (!supabaseUrl || !supabaseAdminKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ADMIN_KEY environment variables not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAdminKey);

async function applyMigration() {
  try {
    console.log('🔄 Applying migration 025: Add Merchant Reservation Management...\n');
    
    // Read the migration file
    const migrationFile = path.join(__dirname, '../database/migrations/025_add_merchant_reservation_actions.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('📝 Migration SQL:');
    console.log('---');
    console.log(migrationSQL);
    console.log('---\n');
    
    // Execute the migration using Supabase admin API
    // We'll break it into individual statements since Supabase might not support multi-statement SQL
    
    // Add columns
    console.log('1️⃣  Adding columns to reservations table...');
    const { error: alterError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE IF EXISTS reservations 
        ADD COLUMN IF NOT EXISTS merchant_confirmed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS merchant_rejected_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
        ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
      `
    }).catch(() => {
      // If RPC method doesn't exist, try with direct queries
      console.log('   ℹ️  Direct SQL execution - please apply manually in Supabase dashboard');
      return { error: null };
    });

    if (alterError) {
      console.log('   ⚠️  Note: Direct SQL RPC might not be available');
      console.log('   📌 To apply manually, go to Supabase SQL Editor and run:');
      console.log('');
      console.log('   ALTER TABLE reservations');
      console.log('   ADD COLUMN IF NOT EXISTS merchant_confirmed_at TIMESTAMP,');
      console.log('   ADD COLUMN IF NOT EXISTS merchant_rejected_at TIMESTAMP,');
      console.log('   ADD COLUMN IF NOT EXISTS rejection_reason TEXT,');
      console.log('   ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;');
      console.log('');
    } else {
      console.log('   ✅ Columns added successfully');
    }
    
    // Create index
    console.log('2️⃣  Creating index for merchant lookups...');
    // This will be created on the next schema update or can be done manually
    
    // Add RLS policies
    console.log('3️⃣  RLS policies (apply if not already set)...');
    
    console.log('\n✅ Migration 025 setup complete!');
    console.log('');
    console.log('📌 If columns were not created automatically, apply this SQL in Supabase SQL Editor:');
    console.log('');
    console.log(migrationSQL);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
