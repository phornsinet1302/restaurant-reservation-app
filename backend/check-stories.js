const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/debug/stories/433b5f9c-c70f-4f91-90a1-dad49634f133',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📖 Stories Check Result:');
    try {
      const result = JSON.parse(data);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.end();
