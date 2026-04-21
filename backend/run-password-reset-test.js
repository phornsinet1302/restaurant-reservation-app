#!/usr/bin/env node
/**
 * AUTOMATED TESTING SCRIPT for Password Reset
 * This script will:
 * 1. Kill all Node processes
 * 2. Start the backend fresh
 * 3. Wait for server to be ready
 * 4. Test the password reset endpoint
 */

const { spawn, exec } = require('child_process');
const axios = require('axios');
const path = require('path');

const API_URL = 'http://10.1.66.195:3000';
const BACKEND_DIR = path.resolve(__dirname);

console.log('╔═══════════════════════════════════════════╗');
console.log('║  🧪 PASSWORD RESET - AUTOMATED TEST      ║');
console.log('╚═══════════════════════════════════════════╝\n');

let serverProcess = null;

// Step 1: Kill existing Node processes
async function killNodeProcesses() {
  console.log('📍 Step 1: Killing existing Node processes...');
  return new Promise((resolve) => {
    exec('taskkill /F /IM node.exe 2>nul', () => {
      console.log('   ✅ Old processes killed');
      setTimeout(resolve, 2000); // Wait 2 seconds
    });
  });
}

// Step 2: Start backend server
function startBackend() {
  console.log('\n📍 Step 2: Starting backend server...');
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: BACKEND_DIR,
      stdio: 'pipe'
    });

    let startedSuccessfully = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      
      if (output.includes('running on port')) {
        startedSuccessfully = true;
        console.log('   ✅ Backend started successfully!');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('   ❌ Error:', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('   ❌ Failed to start:', err.message);
      reject(err);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      if (!startedSuccessfully) {
        console.log('   ⚠️  Server may be starting... continuing with tests');
        resolve();
      }
    }, 15000);
  });
}

// Step 3: Test password reset
async function testPasswordReset() {
  console.log('\n📍 Step 3: Testing password reset endpoint...\n');
  
  try {
    // First, login to get a token
    console.log('🔐 Sub-step A: Login to get token...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'liig03170@gmail.com', // Use the email that failed before
      password: 'TestPassword123!'
    });

    const token = loginRes.data.session?.access_token;
    if (!token) {
      console.error('   ❌ No token received from login!');
      console.error('   Response:', JSON.stringify(loginRes.data, null, 2));
      return false;
    }

    console.log('   ✅ Login successful, token received');
    console.log(`   Token preview: ${token.substring(0, 30)}...`);

    // Now test password reset
    console.log('\n🔐 Sub-step B: Test password reset...');
    const resetRes = await axios.post(
      `${API_URL}/api/auth/reset-password`,
      {
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Password reset successful!');
    console.log('   Response:', JSON.stringify(resetRes.data, null, 2));
    return true;

  } catch (error) {
    console.error('   ❌ Password reset failed!');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', JSON.stringify(error.response?.data, null, 2));
    return false;
  }
}

// Step 4: Cleanup
function cleanup() {
  console.log('\n📍 Step 4: Cleanup...');
  if (serverProcess) {
    console.log('   Stopping server...');
    serverProcess.kill();
  }
}

// Main execution
async function runTests() {
  try {
    await killNodeProcesses();
    await startBackend();
    const success = await testPasswordReset();
    
    console.log('\n╔═══════════════════════════════════════════╗');
    if (success) {
      console.log('║  ✅ ALL TESTS PASSED!                    ║');
    } else {
      console.log('║  ❌ TESTS FAILED - CHECK ERRORS ABOVE    ║');
    }
    console.log('╚═══════════════════════════════════════════╝\n');
    
    cleanup();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    cleanup();
    process.exit(1);
  }
}

runTests();
