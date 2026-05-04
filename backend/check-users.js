const supabase = require('./config/supabase');

(async () => {
  // Check phorn user in public.users
  const { data: phorn } = await supabase.from('users').select('*').eq('email', 'phorn.sinet24@kit.edu.kh').single();
  console.log('phorn public.users:', JSON.stringify(phorn, null, 2));

  // Check hrest user in public.users
  const { data: hrest } = await supabase.from('users').select('*').eq('email', 'hrest@gmail.com').single();
  console.log('hrest public.users:', JSON.stringify(hrest, null, 2));

  // Try auth sign in for phorn
  const { data: a1, error: e1 } = await supabase.auth.signInWithPassword({
    email: 'phorn.sinet24@kit.edu.kh',
    password: '12356789',
  });
  console.log('phorn auth sign-in:', e1 ? e1.message : 'SUCCESS id=' + a1.user.id);

  // Try auth sign in for hrest
  const { data: a2, error: e2 } = await supabase.auth.signInWithPassword({
    email: 'hrest@gmail.com',
    password: '12356789',
  });
  console.log('hrest auth sign-in:', e2 ? e2.message : 'SUCCESS id=' + a2.user.id);

  process.exit(0);
})();
