#!/usr/bin/env node

/**
 * Test script to verify the /api/menu endpoint
 * Run with: node test-menu-endpoint.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function test() {
  try {
    console.log('🧪 Testing /api/menu endpoint...\n');

    // Test 1: Get all menu items (no filter)
    console.log('📋 Test 1: GET /api/menu (no restaurant_id filter)');
    try {
      const res1 = await axios.get(`${BASE_URL}/api/menu`);
      console.log('✅ Status:', res1.status);
      console.log('   Response type:', typeof res1.data);
      console.log('   Is array?', Array.isArray(res1.data));
      console.log('   Item count:', res1.data?.length || 0);
      if (res1.data && res1.data.length > 0) {
        console.log('   First item:', JSON.stringify(res1.data[0], null, 2));
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
      if (err.response) {
        console.error('   Status:', err.response.status);
        console.error('   Data:', err.response.data);
      }
    }

    // Test 2: Get menu items with restaurant_id filter
    // Note: Replace with actual restaurant_id from your database
    console.log('\n📋 Test 2: GET /api/menu?restaurant_id={id}');
    try {
      // First, get all restaurants to find a valid ID
      const restRes = await axios.get(`${BASE_URL}/api/restaurants`);
      if (restRes.data && restRes.data.length > 0) {
        const restaurantId = restRes.data[0].id;
        console.log(`   Using restaurant_id: ${restaurantId}`);
        
        const res2 = await axios.get(`${BASE_URL}/api/menu?restaurant_id=${restaurantId}`);
        console.log('✅ Status:', res2.status);
        console.log('   Response type:', typeof res2.data);
        console.log('   Is array?', Array.isArray(res2.data));
        console.log('   Item count:', res2.data?.length || 0);
        if (res2.data && res2.data.length > 0) {
          res2.data.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.name} - $${item.price}`);
          });
        }
      } else {
        console.log('⚠️  No restaurants found to test');
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
      if (err.response) {
        console.error('   Status:', err.response.status);
        console.error('   Data:', err.response.data);
      }
    }

    console.log('\n✅ Test complete');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
test().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
