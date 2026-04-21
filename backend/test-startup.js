#!/usr/bin/env node
/**
 * Minimal backend test - checks if core dependencies load
 */

console.log('🧪 Testing backend dependencies...\n');

try {
  console.log('1. Loading dotenv...');
  require("dotenv").config({ path: require('path').resolve(__dirname, '.env') });
  console.log('   ✅ dotenv loaded');
  
  console.log('2. Loading express...');
  const express = require("express");
  console.log('   ✅ express loaded');
  
  console.log('3. Loading supabase config...');
  const supabase = require('./config/supabase');
  console.log('   ✅ supabase config loaded');
  
  console.log('4. Loading auth routes...');
  const authRoutes = require('./routes/authRoutes');
  console.log('   ✅ auth routes loaded');
  
  console.log('5. Loading auth middleware...');
  const { protect } = require('./middleware/authMiddleware');
  console.log('   ✅ auth middleware loaded');
  
  console.log('\n✅ All dependencies loaded successfully!\n');
  
  // Try to start a basic server
  console.log('💻 Attempting to start server...');
  const app = express();
  app.use(express.json());
  app.get('/', (req, res) => res.send('OK'));
  app.use('/api/auth', authRoutes);
  
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log('\nℹ️  Press Ctrl+C to stop\n`);
  });
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
