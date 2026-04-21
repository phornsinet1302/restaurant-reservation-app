#!/usr/bin/env node
/**
 * Quick diagnostic to verify JWT token verification works
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const jwt = require('jsonwebtoken');

console.log('\n╔════════════════════════════════════════╗');
console.log('║ 🔧 JWT VERIFICATION DIAGNOSTIC        ║');
console.log('╚════════════════════════════════════════╝\n');

// The token from the error
const tokenFromError = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQ5ZWI0NzYxLTlhY2UtNDgzYi1hZmU5LTBmMTczYzZlMzU4MiIsImVtYWlsIjoibGlpZzAzMTcwQGdtYWlsLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTc3NjY3NDgwMSwiZXhwIjoxNzc3Mjc5NjAxfQ.JabrjPCTHAVKy6ON9bRtV4Pox1b8--E6kMUMvuA34Yg';

const jwtSecret = process.env.JWT_SECRET;

console.log('📋 Environment Check:');
console.log('   JWT_SECRET set?', !!jwtSecret);
console.log('   JWT_SECRET value:', jwtSecret ? jwtSecret.substring(0, 40) + '...' : 'NOT SET');

console.log('\n🔍 Token Check:');
console.log('   Token length:', tokenFromError.length);
console.log('   Token preview:', tokenFromError.substring(0, 40) + '...');

// Try to decode without verification
try {
  const decoded = jwt.decode(tokenFromError);
  console.log('\n✅ Token decoded successfully (without verification):');
  console.log('   ID:', decoded.id);
  console.log('   Email:', decoded.email);
  console.log('   Role:', decoded.role);
  console.log('   Issued at:', new Date(decoded.iat * 1000).toISOString());
  console.log('   Expires at:', new Date(decoded.exp * 1000).toISOString());
} catch (err) {
  console.error('\n❌ Failed to decode token:', err.message);
}

// Try to verify with JWT_SECRET
console.log('\n🔐 Verification with JWT_SECRET:');
try {
  if (!jwtSecret) {
    console.error('   ❌ JWT_SECRET not set in .env!');
  } else {
    const verified = jwt.verify(tokenFromError, jwtSecret);
    console.log('   ✅ Token verified successfully!');
    console.log('   User ID:', verified.id);
    console.log('   Email:', verified.email);
  }
} catch (err) {
  console.error('   ❌ Verification failed:', err.message);
  console.log('   Error type:', err.name);
}

console.log('\n' + '═'.repeat(40));
console.log('If JWT_SECRET is set but verification fails,');
console.log('the token was created with a DIFFERENT secret.');
console.log('═'.repeat(40) + '\n');
