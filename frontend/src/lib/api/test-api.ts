/**
 * API Foundation Test Script
 * 
 * Simple test to verify the API foundation is working correctly.
 * Run this in the browser console or create a test page.
 */

import apiClient from './client';
import { connectionsService } from './services/connections.service';
import { API_CONFIG } from './config';

export async function testApiFoundation() {
  const results = {
    config: false,
    healthCheck: false,
    connectionsList: false,
    errorHandling: false,
  };

  console.log('🧪 Testing API Foundation...\n');

  // Test 1: Configuration
  console.log('1. Testing API Configuration...');
  try {
    console.log(`   Base URL: ${API_CONFIG.baseURL}`);
    console.log(`   Timeout: ${API_CONFIG.timeout}ms`);
    console.log(`   Retries: ${API_CONFIG.retries}`);
    results.config = true;
    console.log('   ✅ Configuration OK\n');
  } catch (error) {
    console.error('   ❌ Configuration failed:', error);
    console.log('');
  }

  // Test 2: Health Check
  console.log('2. Testing Health Check Endpoint...');
  try {
    const health = await apiClient.get('health');
    console.log('   Response:', health);
    if (health && typeof health === 'object' && 'status' in health) {
      results.healthCheck = true;
      console.log('   ✅ Health check passed\n');
    } else {
      console.log('   ⚠️  Unexpected response format\n');
    }
  } catch (error) {
    console.error('   ❌ Health check failed:', error);
    console.log('');
  }

  // Test 3: Connections List
  console.log('3. Testing Connections List API...');
  try {
    const connections = await connectionsService.list();
    console.log(`   Found ${connections.length} connection(s)`);
    if (Array.isArray(connections)) {
      results.connectionsList = true;
      console.log('   ✅ Connections list API working\n');
      
      // Show connection details if available
      if (connections.length > 0) {
        console.log('   Connection(s):');
        connections.slice(0, 3).forEach((conn, idx) => {
          console.log(`   ${idx + 1}. ${conn.name} (${conn.status})`);
        });
        if (connections.length > 3) {
          console.log(`   ... and ${connections.length - 3} more`);
        }
        console.log('');
      }
    } else {
      console.log('   ⚠️  Unexpected response format\n');
    }
  } catch (error: any) {
    console.error('   ❌ Connections list failed:', error.message);
    console.log('');
  }

  // Test 4: Error Handling
  console.log('4. Testing Error Handling...');
  try {
    await apiClient.get('connections/nonexistent-id-12345');
    console.log('   ⚠️  Should have thrown an error\n');
  } catch (error: any) {
    if (error.statusCode === 404) {
      results.errorHandling = true;
      console.log(`   ✅ Error handling working (404: ${error.message})\n`);
    } else {
      console.log(`   ⚠️  Unexpected error: ${error.message}\n`);
    }
  }

  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  console.log(`   Config:        ${results.config ? '✅' : '❌'}`);
  console.log(`   Health Check:  ${results.healthCheck ? '✅' : '❌'}`);
  console.log(`   Connections:   ${results.connectionsList ? '✅' : '❌'}`);
  console.log(`   Error Handle:  ${results.errorHandling ? '✅' : '❌'}`);
  console.log('========================\n');

  const allPassed = Object.values(results).every((v) => v === true);
  
  if (allPassed) {
    console.log('🎉 All tests passed! API foundation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }

  return results;
}

// Export for use in components or browser console
export default testApiFoundation;

