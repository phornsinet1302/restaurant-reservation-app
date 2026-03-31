const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase anon key (first 10 chars):', supabaseKey ? supabaseKey.slice(0, 10) + '...' : null);
console.log('Service role key:', supabaseServiceKey ? 'present' : 'NOT SET - writes to RLS tables will fail');

// Public client (for reads / client-facing queries)
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client (bypasses RLS - for server-side writes)
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : supabase; // fallback to anon if no service key

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;