const supabase = require('./config/supabase');

const OLD_ID = '5b56ec48-c1b2-4c23-bb1b-05ce1a5baa7d';
const NEW_ID = 'e32558f9-5847-414e-9d83-e4389810a157'; // auth.users ID that owns the restaurant

(async () => {
  // Step 1: Delete old hrest entry
  const { error: delErr } = await supabase.from('users').delete().eq('id', OLD_ID);
  console.log('Delete old hrest:', delErr ? delErr.message : 'OK');

  // Step 2: Check that NEW_ID is not already taken in public.users
  const { data: existing } = await supabase.from('users').select('id, email').eq('id', NEW_ID).single();
  console.log('Existing entry for new ID:', existing);

  if (existing) {
    // Update existing entry to hrest's info
    const { error: upErr } = await supabase.from('users').update({
      name: 'Restaurant Owner',
      email: 'hrest@gmail.com',
      role: 'restaurant',
      password_hash: '$2b$10$vdKEtyjgwlBpKpCwbvtvc.08Dp46CJNCQQgk.5Lr4Uyrma347PoOu',
    }).eq('id', NEW_ID);
    console.log('Updated existing to hrest:', upErr ? upErr.message : 'OK');
  } else {
    // Insert hrest with the new ID
    const { error: insErr } = await supabase.from('users').insert({
      id: NEW_ID,
      name: 'Restaurant Owner',
      email: 'hrest@gmail.com',
      role: 'restaurant',
      password_hash: '$2b$10$vdKEtyjgwlBpKpCwbvtvc.08Dp46CJNCQQgk.5Lr4Uyrma347PoOu',
    });
    console.log('Insert hrest with new ID:', insErr ? insErr.message : 'OK');
  }

  // Step 3: Verify
  const { data: verify } = await supabase.from('users').select('id, email, role').eq('email', 'hrest@gmail.com').single();
  console.log('Verified hrest:', JSON.stringify(verify));

  const { data: rest } = await supabase.from('restaurants').select('id, name, merchant_id').eq('merchant_id', NEW_ID).single();
  console.log('Restaurant for hrest:', JSON.stringify(rest));

  process.exit(0);
})();
