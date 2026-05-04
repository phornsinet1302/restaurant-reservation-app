const { createClient } = require('@supabase/supabase-js');

// dotenv is already loaded in server.js, don't load again
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n✅ Supabase Configuration Loaded');
console.log('   URL:', supabaseUrl ? '✓' : '✗');
console.log('   Anon Key:', supabaseKey ? '✓' : '✗');
console.log('   Service Role Key:', supabaseServiceKey ? '✓' : '✗\n');


// Public client (for reads / client-facing queries)
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client (bypasses RLS - for server-side writes)
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js/2.0.0'
        }
      }
    })
  : supabase; // fallback to anon if no service key

module.exports = supabase;
module.exports.supabaseAdmin = supabaseAdmin;