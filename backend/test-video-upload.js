const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

async function testVideoUpload() {
  try {
    console.log('🎥 Testing video upload endpoint...\n');

    // Create a dummy video file for testing
    const dummyVideoPath = path.join(__dirname, 'dummy-video.mp4');
    
    // Create a small test file (1MB dummy video)
    const buffer = Buffer.alloc(1024 * 1024, 'test');
    fs.writeFileSync(dummyVideoPath, buffer);
    console.log('✅ Created dummy video file (1MB)');

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(dummyVideoPath), {
      filename: 'test-video.mp4',
      contentType: 'video/mp4',
    });

    console.log('📤 Uploading to http://localhost:3000/api/media/upload-video...');

    const response = await axios.post(
      'http://localhost:3000/api/media/upload-video',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer test-token', // Dummy token for testing
        },
        timeout: 30000,
      }
    );

    console.log('\n✅ Upload successful!');
    console.log('Response:', response.data);

    // Clean up
    fs.unlinkSync(dummyVideoPath);
    console.log('🧹 Cleaned up test file');

  } catch (error) {
    console.error('\n❌ Upload failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }

    // Clean up on error
    const dummyVideoPath = path.join(__dirname, 'dummy-video.mp4');
    if (fs.existsSync(dummyVideoPath)) {
      fs.unlinkSync(dummyVideoPath);
    }
  }
}

// Run test
testVideoUpload();
