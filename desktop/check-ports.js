#!/usr/bin/env node

/**
 * Helper script to check what ports the desktop app will use
 * Run this before building to verify your configuration
 */

const fs = require('fs');
const path = require('path');

console.log('');
console.log('🔍 ===============================================');
console.log('🔍  DB Manager Desktop - Port Detection Check');
console.log('🔍 ===============================================');
console.log('');

// Check backend port
function checkBackendPort() {
  const backendPath = path.join(__dirname, '..', 'backend');
  const envPath = path.join(backendPath, '.env');
  
  console.log('📡 Backend Configuration:');
  console.log(`   Looking for: ${envPath}`);
  
  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file found');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/^PORT=(\d+)/m);
    if (portMatch && portMatch[1]) {
      console.log(`   ✅ PORT=${portMatch[1]} detected`);
      console.log(`   → Backend will run on: http://localhost:${portMatch[1]}`);
      return portMatch[1];
    } else {
      console.log('   ⚠️  No PORT setting found in .env');
      console.log('   → Will use default: http://localhost:3000');
      return '3000';
    }
  } else {
    console.log('   ⚠️  .env file not found');
    console.log('   → Will use default: http://localhost:3000');
    return '3000';
  }
}

// Check frontend port
function checkFrontendPort() {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  const envPath = path.join(frontendPath, '.env');
  
  console.log('');
  console.log('🌐 Frontend Configuration (Dev Mode):');
  console.log(`   Looking for: ${envPath}`);
  
  if (fs.existsSync(envPath)) {
    console.log('   ✅ .env file found');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/^VITE_PORT=(\d+)/m);
    if (portMatch && portMatch[1]) {
      console.log(`   ✅ VITE_PORT=${portMatch[1]} detected`);
      console.log(`   → Frontend dev server: http://localhost:${portMatch[1]}`);
      return portMatch[1];
    } else {
      console.log('   ⚠️  No VITE_PORT setting found in .env');
      console.log('   → Will use default: http://localhost:8080');
      return '8080';
    }
  } else {
    console.log('   ⚠️  .env file not found');
    console.log('   → Will use default: http://localhost:8080');
    return '8080';
  }
}

// Check encryption key
function checkEncryptionKey() {
  const backendPath = path.join(__dirname, '..', 'backend');
  const envPath = path.join(backendPath, '.env');
  
  console.log('');
  console.log('🔐 Encryption Configuration:');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const keyMatch = envContent.match(/^ENCRYPTION_KEY=(.+)$/m);
    if (keyMatch && keyMatch[1] && keyMatch[1].trim() !== 'change-this-to-a-secure-random-key') {
      console.log('   ✅ ENCRYPTION_KEY is configured');
    } else {
      console.log('   ⚠️  ENCRYPTION_KEY not set or using default value');
      console.log('   → Generate one with: openssl rand -base64 32');
    }
  } else {
    console.log('   ❌ backend/.env not found - ENCRYPTION_KEY required!');
  }
}

// Run checks
const backendPort = checkBackendPort();
const frontendPort = checkFrontendPort();
checkEncryptionKey();

console.log('');
console.log('📋 Summary:');
console.log('═══════════════════════════════════════════════');
console.log(`   Backend Port:  ${backendPort}`);
console.log(`   Frontend Port: ${frontendPort} (dev mode only)`);
console.log('');
console.log('💡 Tips:');
console.log('   • Change ports in backend/.env (PORT) and frontend/.env (VITE_PORT)');
console.log('   • Desktop app will auto-detect these settings');
console.log('   • No code changes needed!');
console.log('');
console.log('🚀 Ready to build? Run: npm run build');
console.log('');



