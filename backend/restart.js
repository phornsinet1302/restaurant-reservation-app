#!/usr/bin/env node
/**
 * Simple Backend Restart Script
 */

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('\n╔════════════════════════════════════════╗');
console.log('║  🔄 BACKEND RESTART SCRIPT             ║');
console.log('╚════════════════════════════════════════╝\n');

const BACKEND_DIR = path.resolve(__dirname);

// Kill existing processes
console.log('🗑️  Killing old Node processes...');
exec('taskkill /F /IM node.exe 2>nul', () => {
  setTimeout(startBackend, 2000);
});

function startBackend() {
  console.log('🚀 Starting backend server...\n');
  
  const server = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    stdio: 'inherit'
  });

  server.on('error', (err) => {
    console.error('\n❌ Failed to start:', err.message);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`\n⚠️  Server stopped with code ${code}`);
  });
}
