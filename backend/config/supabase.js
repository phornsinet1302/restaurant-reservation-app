const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase anon key (first 10 chars):', supabaseKey ? supabaseKey.slice(0, 10) + '...' : null);

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;