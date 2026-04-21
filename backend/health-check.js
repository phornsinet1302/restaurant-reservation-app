// Quick health check script
const axios = require('axios');

const API_URL = 'http://10.1.66.195:3000'; // Use the IP from .env

async function checkHealth() {
  try {
    console.log('🏥 Checking backend health...\n');
    
    // Test 1: Basic health check
    console.log('Test 1: Basic endpoint');
    const health = await axios.get(`${API_URL}/`);
    console.log('✅ Backend is running:', health.data);
    
    // Test 2: Check if auth route is accessible
    console.log('\nTest 2: Auth routes are accessible');
    try {
      await axios.post(`${API_URL}/api/auth/login`, {
        email: 'test@test.com',
        password: 'wrong'
      });
    } catch (e) {
      if (e.response?.status === 400 || e.response?.status === 401) {
        console.log('✅ Auth routes are accessible (got expected 400/401 from login)');
      } else {
        console.log('❌ Unexpected response:', e.response?.status, e.response?.data);
      }
    }
    
    // Test 3: Try reset-password without auth (should fail with 401)
    console.log('\nTest 3: Reset password endpoint without token');
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        password: 'new',
        confirmPassword: 'new'
      });
    } catch (e) {
      console.log('Response status:', e.response?.status);
      console.log('Response data:', e.response?.data);
      if (e.response?.status === 401) {
        console.log('✅ Correctly requires authentication');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking backend:', error.message);
    console.error('Make sure backend is running at', API_URL);
  }
}

checkHealth();
