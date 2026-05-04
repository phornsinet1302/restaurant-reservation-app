// Diagnostic script to check Supabase configuration
require('dotenv').config();

console.log('\n' + '='.repeat(60));
console.log('🔍 SUPABASE CONFIGURATION DIAGNOSTIC');
console.log('='.repeat(60));

// Check 1: Environment variables
console.log('\n1️⃣  ENVIRONMENT VARIABLES:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ MISSING');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set (' + process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...)' : '❌ MISSING');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set (' + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...)' : '❌ MISSING - THIS IS THE PROBLEM!');

// Check 2: Key lengths (valid keys should have specific lengths)
console.log('\n2️⃣  KEY VALIDATION:');
const anonKeyLen = process.env.SUPABASE_ANON_KEY?.length || 0;
const serviceKeyLen = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0;
console.log('   Anon Key length:', anonKeyLen, anonKeyLen > 100 ? '✅' : '❌');
console.log('   Service Role Key length:', serviceKeyLen, serviceKeyLen > 100 ? '✅' : '❌');

// Check 3: Supabase client initialization
console.log('\n3️⃣  CLIENT INITIALIZATION:');
try {
  const supabase = require('./config/supabase');
  const { supabaseAdmin } = require('./config/supabase');
  console.log('   Regular client:', supabase ? '✅ Created' : '❌ Failed');
  console.log('   Admin client:', supabaseAdmin ? '✅ Created' : '❌ Failed');
  
  // Check if they're different
  if (supabase === supabaseAdmin) {
    console.log('\n   ⚠️  WARNING: Clients are the SAME! Service Role Key likely not set.');
    console.log('   This means RLS policies WILL be enforced even though we\'re trying to bypass them.');
  } else {
    console.log('\n   ✅ Clients are different (good - admin should bypass RLS)');
  }
} catch (err) {
  console.error('   ❌ Error loading Supabase clients:', err.message);
}

// Check 4: Recommendation
console.log('\n' + '='.repeat(60));
console.log('📋 DIAGNOSTIC SUMMARY:');
console.log('='.repeat(60));

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n❌ PROBLEM FOUND: SUPABASE_SERVICE_ROLE_KEY is not set!');
  console.log('\n✅ TO FIX:');
  console.log('   1. Go to Supabase Dashboard');
  console.log('   2. Project Settings → API → "service_role secret"');
  console.log('   3. Copy the key');
  console.log('   4. Add to backend/.env:');
  console.log('      SUPABASE_SERVICE_ROLE_KEY=sk-xxx...');
  console.log('   5. Restart backend server');
} else if (anonKeyLen < 100 || serviceKeyLen < 100) {
  console.log('\n⚠️  Keys may be incomplete or incorrect length');
} else {
  console.log('\n✅ Setup appears correct. If still getting NULL, check:');
  console.log('   1. RLS policies on users table in Supabase Dashboard');
  console.log('   2. Ensure profile_picture_url column allows NULL by default');
  console.log('   3. Check for database triggers that might block updates');
}

console.log('\n' + '='.repeat(60) + '\n');
