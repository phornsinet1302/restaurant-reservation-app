// Quick test script to verify password reset endpoint
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testPasswordReset() {
  try {
    console.log('🧪 Testing Password Reset Endpoint');
    console.log('=====================================\n');

    // Step 1: Login to get token
    console.log('📍 Step 1: Login to get token');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });

    const token = loginRes.data.session?.access_token;
    console.log('✓ Token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
    console.log('Full login response:', JSON.stringify(loginRes.data, null, 2));

    if (!token) {
      console.error('❌ No token in login response!');
      return;
    }

    // Step 2: Test reset password endpoint
    console.log('\n📍 Step 2: Test password reset');
    const resetRes = await axios.post(
      `${API_URL}/api/auth/reset-password`,
      {
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Password reset successful!');
    console.log('Response:', JSON.stringify(resetRes.data, null, 2));

  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Response:', JSON.stringify(error.response?.data, null, 2));
    console.error('Config headers:', error.config?.headers);
  }
}

testPasswordReset();
