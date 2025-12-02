/**
 * Backend server runner for Electron
 * This runs the NestJS backend directly in the Electron main process
 */

const path = require('path');

/**
 * Start the backend server
 */
async function startBackend(backendPath, envVars) {
  // Set environment variables
  Object.keys(envVars).forEach(key => {
    process.env[key] = envVars[key];
  });
  
  console.log('📦 Loading NestJS backend...');
  console.log('Backend path:', backendPath);
  console.log('Port:', envVars.PORT);
  console.log('Database path:', envVars.DATABASE_PATH);
  
  try {
    // Change to backend directory so relative paths work
    const originalCwd = process.cwd();
    process.chdir(backendPath);
    
    // Load the backend main.js
    const mainPath = path.join(backendPath, 'dist', 'main.js');
    console.log('Loading:', mainPath);
    
    // Require and run the backend
    require(mainPath);
    
    console.log('✅ Backend module loaded successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    throw error;
  }
}

module.exports = { startBackend };



