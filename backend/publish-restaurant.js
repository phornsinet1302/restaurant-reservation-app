const http = require('http');

const merchantId = '19df1b44-fb48-4c80-a5a9-7ff731d94050';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/debug/publish-restaurants/${merchantId}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 2
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n✅ Response from server:');
    console.log(data);
    console.log('\n✨ Your restaurants are now PUBLISHED!');
    console.log('📱 Stories will now be visible on the customer home screen!\n');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write('{}');
req.end();
