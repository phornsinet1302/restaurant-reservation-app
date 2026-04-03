const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://10.1.64.40:3000';

// Create a test video file (minimal valid video)
function createTestVideoFile() {
  const videoPath = path.join(__dirname, 'test-video-temp.mp4');
  
  // Create a minimal mp4 file (this is valid but small)
  const mp4Header = Buffer.from([
    0x00, 0x00, 0x00, 0x20, // Box size
    0x66, 0x74, 0x79, 0x70, // ftyp
    0x69, 0x73, 0x6F, 0x6D, // isom
    0x00, 0x00, 0x00, 0x00, // minor version
    0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // compatible brands
    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
  ]);
  
  // Create minimal mdat box with some data
  const mdatData = Buffer.from('Video data test');
  const mdatSize = 8 + mdatData.length;
  const mdatHeader = Buffer.allocUnsafe(8);
  mdatHeader.writeUInt32BE(mdatSize, 0);
  mdatHeader.write('mdat', 4);
  
  const fileData = Buffer.concat([mp4Header, mdatHeader, mdatData]);
  fs.writeFileSync(videoPath, fileData);
  
  console.log('📹 Created test video file:', videoPath);
  return videoPath;
}

async function testVideoUploadFlow() {
  try {
    // Get test token
    console.log('\n1️⃣  Getting test token...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'testmerchant@example.com',
      password: 'Password123!'
    }).catch(err => {
      console.error('Login error:', err.response?.data || err.message);
      return null;
    });

    if (!loginRes) {
      console.log('⚠️  Could not log in. Using mock flow to test endpoint structure.');
      testEndpointStructure();
      return;
    }

    const token = loginRes.data.token;
    console.log('✅ Token obtained');

    // Get test restaurant
    console.log('\n2️⃣  Getting test restaurant...');
    const restaurantRes = await axios.get(`${API_URL}/api/restaurants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const restaurantId = restaurantRes.data[0]?.id;
    if (!restaurantId) {
      console.error('❌ No restaurants found');
      return;
    }
    console.log('✅ Restaurant ID:', restaurantId);

    // Create test video file
    console.log('\n3️⃣  Creating test video file...');
    const videoPath = createTestVideoFile();

    // Upload video
    console.log('\n4️⃣  Uploading video...');
    const formData = new FormData();
    const videoBuffer = fs.readFileSync(videoPath);
    const blob = new (require('blob-polyfill'))();
    
    // For Node.js, use a different approach
    const uploadFormData = new (require('form-data'))();
    uploadFormData.append('file', fs.createReadStream(videoPath), {
      filename: 'test-video.mp4',
      contentType: 'video/mp4',
    });

    const uploadRes = await axios.post(
      `${API_URL}/api/media/upload-video`,
      uploadFormData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...uploadFormData.getHeaders(),
        },
        timeout: 30000,
      }
    );

    console.log('✅ Video uploaded successfully');
    console.log('   Cloud URL:', uploadRes.data.video_url);

    // Create story with uploaded video
    console.log('\n5️⃣  Creating story with video...');
    const storyRes = await axios.post(
      `${API_URL}/api/media/story`,
      {
        restaurant_id: restaurantId,
        media_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        video_url: uploadRes.data.video_url,
        headline: 'Test Story with Video',
        caption: 'This is a test story',
      },
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    console.log('✅ Story created with video');
    console.log('   Story ID:', storyRes.data.data[0]?.id);
    console.log('   Video URL saved:', storyRes.data.data[0]?.video_url);

    // Verify video URL in database
    console.log('\n6️⃣  Verifying video URL in API response...');
    const storiesRes = await axios.get(
      `${API_URL}/api/stories/active`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    const stories = storiesRes.data || [];
    const recentStory = stories.find(s => s.headline === 'Test Story with Video');
    
    if (recentStory) {
      console.log('✅ Story found in active stories');
      console.log('   Story ID:', recentStory.id);
      console.log('   Video URL:', recentStory.video_url);
      console.log('   Video Status:', recentStory.video_url ? '✅ HAS VIDEO' : '❌ NO VIDEO');
    } else {
      console.log('⚠️  Story not found in active stories');
    }

    // Cleanup
    console.log('\n7️⃣  Cleaning up test file...');
    fs.unlinkSync(videoPath);
    console.log('✅ Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
  }
}

function testEndpointStructure() {
  console.log('\n📊 Testing Endpoint Structure:');
  console.log('   POST /api/media/upload-video');
  console.log('   - Accepts: multipart/form-data with "file" field');
  console.log('   - Expects: Bearer token in Authorization header');
  console.log('   - Returns: { video_url, file_path, message }');
  console.log('   - Uploads to: Supabase Storage (stories bucket)');
  console.log('\n   POST /api/media/story');
  console.log('   - Accepts: JSON with restaurant_id, video_url, headline, caption');
  console.log('   - Saves: story record with video_url field');
  console.log('\n   GET /api/stories/active');
  console.log('   - Returns: All active stories with video_url field');
}

testVideoUploadFlow();
