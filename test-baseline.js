#!/usr/bin/env node

/**
 * Baseline Functionality Test Script
 * Tests critical endpoints before and after refactoring to ensure no breaking changes
 */

const fs = require('fs');
const path = require('path');

// Server configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'test123456';

// Test results storage
let testResults = [];
let authToken = null;

// Test utilities
function logTest(name, status, details = '') {
    const result = {
        name,
        status,
        details,
        timestamp: new Date().toISOString()
    };
    testResults.push(result);
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${name}${details ? ': ' + details : ''}`);
}

function logSection(title) {
    console.log(`\n🔍 ${title}`);
    console.log('='.repeat(50));
}

// Test functions
async function testServerHealth() {
    logSection('Server Health Check');
    
    try {
        const response = await fetch(`${SERVER_URL}/health`);
        if (response.ok) {
            logTest('Server Health', 'PASS');
            return true;
        } else {
            logTest('Server Health', 'FAIL', `Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('Server Health', 'FAIL', `Error: ${error.message}`);
        return false;
    }
}

async function testAuthEndpoints() {
    logSection('Authentication Endpoints');
    
    // Test login endpoint structure (without actual auth)
    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'nonexistent@test.com',
                password: 'wrongpassword'
            })
        });
        
        // We expect this to fail, but the endpoint should be accessible
        if (response.status === 400 || response.status === 401) {
            logTest('Auth Login Endpoint', 'PASS', 'Endpoint accessible');
        } else {
            logTest('Auth Login Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('Auth Login Endpoint', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test signup endpoint structure
    try {
        const response = await fetch(`${SERVER_URL}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'test123'
            })
        });
        
        // Endpoint should be accessible (may fail due to user exists or validation)
        if (response.status >= 400 && response.status < 500) {
            logTest('Auth Signup Endpoint', 'PASS', 'Endpoint accessible');
        } else {
            logTest('Auth Signup Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('Auth Signup Endpoint', 'FAIL', `Error: ${error.message}`);
    }
}

async function testBrowseReports() {
    logSection('Browse Reports Endpoint');
    
    try {
        const response = await fetch(`${SERVER_URL}/api/browse-reports`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        
        // Should return 401 without auth or 200 with auth
        if (response.status === 401 || response.status === 200) {
            logTest('Browse Reports Endpoint', 'PASS', `Status: ${response.status}`);
        } else {
            logTest('Browse Reports Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('Browse Reports Endpoint', 'FAIL', `Error: ${error.message}`);
    }
}

async function testProfileEndpoints() {
    logSection('Profile Endpoints');
    
    try {
        const response = await fetch(`${SERVER_URL}/api/profile`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        
        // Should return 401 without auth or 200 with auth
        if (response.status === 401 || response.status === 200) {
            logTest('Profile GET Endpoint', 'PASS', `Status: ${response.status}`);
        } else {
            logTest('Profile GET Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('Profile GET Endpoint', 'FAIL', `Error: ${error.message}`);
    }
    
    // Test profile update endpoint
    try {
        const response = await fetch(`${SERVER_URL}/api/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({
                full_name: 'Test User'
            })
        });
        
        if (response.status === 401 || response.status === 200) {
            logTest('Profile POST Endpoint', 'PASS', `Status: ${response.status}`);
        } else {
            logTest('Profile POST Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('Profile POST Endpoint', 'FAIL', `Error: ${error.message}`);
    }
}

async function testReportGeneration() {
    logSection('Report Generation Endpoint');
    
    try {
        // Create a small test file
        const testVideoPath = '/tmp/test-video-baseline.mp4';
        
        // Create minimal test data for multipart form
        const formData = new FormData();
        formData.append('customer', 'Test Customer');
        formData.append('project', 'Test Project');
        formData.append('useGemini', 'false');
        
        const response = await fetch(`${SERVER_URL}/api/generate-report`, {
            method: 'POST',
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
            body: formData
        });
        
        // Should return 401 without auth, 400 without file, or other expected status
        if (response.status === 401 || response.status === 400 || response.status === 200) {
            logTest('Report Generation Endpoint', 'PASS', `Status: ${response.status}`);
        } else {
            logTest('Report Generation Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('Report Generation Endpoint', 'FAIL', `Error: ${error.message}`);
    }
}

async function testConfigEndpoints() {
    logSection('Configuration Endpoints');
    
    try {
        const response = await fetch(`${SERVER_URL}/api/master-config`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        
        if (response.status === 401 || response.status === 200) {
            logTest('Config Tiers Endpoint', 'PASS', `Status: ${response.status}`);
        } else {
            logTest('Config Tiers Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('Config Tiers Endpoint', 'FAIL', `Error: ${error.message}`);
    }
}

async function testS3AssetEndpoint() {
    logSection('S3 Asset Endpoint');
    
    try {
        const response = await fetch(`${SERVER_URL}/assets/view-s3-asset?key=test-key`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        
        // Should return 401 without auth or 404/400 with invalid key
        if (response.status === 401 || response.status === 404 || response.status === 400) {
            logTest('S3 Asset Endpoint', 'PASS', `Status: ${response.status}`);
        } else {
            logTest('S3 Asset Endpoint', 'FAIL', `Unexpected status: ${response.status}`);
        }
    } catch (error) {
        logTest('S3 Asset Endpoint', 'FAIL', `Error: ${error.message}`);
    }
}

async function generateReport() {
    logSection('Baseline Test Summary');
    
    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const total = testResults.length;
    
    console.log(`\n📊 Test Results:`);
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${(passed/total*100).toFixed(1)}%`);
    
    // Save detailed results
    const reportData = {
        timestamp: new Date().toISOString(),
        summary: { passed, failed, total, successRate: passed/total*100 },
        results: testResults
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'baseline-test-results.json'),
        JSON.stringify(reportData, null, 2)
    );
    
    console.log(`\n💾 Detailed results saved to baseline-test-results.json`);
    
    return failed === 0;
}

// Main test execution
async function runBaselineTests() {
    console.log('🚀 Starting Baseline Functionality Tests');
    console.log(`📡 Server URL: ${SERVER_URL}`);
    console.log(`⏰ Test Started: ${new Date().toISOString()}\n`);
    
    // Check if server is running
    const serverRunning = await testServerHealth();
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the server first.');
        process.exit(1);
    }
    
    // Run all endpoint tests
    await testAuthEndpoints();
    await testBrowseReports();
    await testProfileEndpoints();
    await testReportGeneration();
    await testConfigEndpoints();
    await testS3AssetEndpoint();
    
    // Generate final report
    const allPassed = await generateReport();
    
    if (allPassed) {
        console.log('\n🎉 All baseline tests passed! Safe to proceed with refactoring.');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Review issues before refactoring.');
        process.exit(1);
    }
}

// Handle command line execution
if (require.main === module) {
    runBaselineTests().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runBaselineTests };