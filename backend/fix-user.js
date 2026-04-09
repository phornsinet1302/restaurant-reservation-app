var supabase = require('./config/supabase');
var bcrypt = require('bcrypt');

async function main() {
  // Re-insert hrest user that got deleted
  var hash = await bcrypt.hash('12356789', 10);
  var r = await supabase.from('users').upsert({
    id: '5b56ec48-c1b2-4c23-bb1b-05ce1a5baa7d',
    email: 'hrest@gmail.com',
    name: 'Restaurant Owner',
    role: 'restaurant',
    password_hash: hash,
  }).select();
  console.log('Re-insert user:', r.error ? r.error.message : 'OK - ' + r.data[0].email);
}

main().catch(console.error);
