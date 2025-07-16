#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests actual functionality, not just endpoint availability
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_USER_EMAIL = 'integration-test@example.com';
const TEST_USER_PASSWORD = 'testPassword123!';
const TEST_VIDEO_PATH = '/tmp/test-integration-video.mp4';

let authToken = null;
let userId = null;
let testResults = [];

// Logging utilities
function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        info: '📘',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }[type] || '📘';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
}

function logTestResult(testName, passed, details = {}) {
    testResults.push({
        testName,
        passed,
        details,
        timestamp: new Date().toISOString()
    });
    
    if (passed) {
        log(`${testName}: PASSED`, 'success');
    } else {
        log(`${testName}: FAILED - ${JSON.stringify(details)}`, 'error');
    }
}

// Test utilities
async function createTestVideo() {
    // Create a simple test video using ffmpeg
    const ffmpegCommand = `ffmpeg -f lavfi -i testsrc=duration=5:size=640x480:rate=30 -f lavfi -i sine=frequency=1000:duration=5 -c:v libx264 -c:a aac -shortest ${TEST_VIDEO_PATH} -y`;
    
    return new Promise((resolve, reject) => {
        require('child_process').exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(TEST_VIDEO_PATH);
            }
        });
    });
}

// Authentication tests
async function testAuthentication() {
    log('Testing Authentication Flow', 'info');
    
    // Test signup
    try {
        const signupResponse = await fetch(`${SERVER_URL}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            })
        });
        
        if (signupResponse.status === 409) {
            log('User already exists, attempting login', 'warning');
        } else if (signupResponse.ok) {
            const signupData = await signupResponse.json();
            logTestResult('User Signup', true, { userId: signupData.user?.id });
        } else {
            const error = await signupResponse.text();
            logTestResult('User Signup', false, { status: signupResponse.status, error });
        }
    } catch (error) {
        logTestResult('User Signup', false, { error: error.message });
    }
    
    // Test login
    try {
        const loginResponse = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_USER_EMAIL,
                password: TEST_USER_PASSWORD
            })
        });
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            authToken = loginData.access_token;
            userId = loginData.user?.id;
            
            // Validate response structure
            const hasRequiredFields = authToken && userId && loginData.refresh_token;
            logTestResult('User Login', hasRequiredFields, { 
                hasToken: !!authToken, 
                hasUserId: !!userId,
                hasRefreshToken: !!loginData.refresh_token
            });
            
            return hasRequiredFields;
        } else {
            const error = await loginResponse.text();
            logTestResult('User Login', false, { status: loginResponse.status, error });
            return false;
        }
    } catch (error) {
        logTestResult('User Login', false, { error: error.message });
        return false;
    }
}

// Profile tests
async function testProfile() {
    log('Testing Profile Operations', 'info');
    
    // Test profile retrieval
    try {
        const getResponse = await fetch(`${SERVER_URL}/api/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (getResponse.ok) {
            const profileData = await getResponse.json();
            
            // Validate profile structure
            const requiredFields = ['id', 'email', 'created_at'];
            const hasRequiredFields = requiredFields.every(field => field in profileData);
            
            logTestResult('Profile Retrieval', hasRequiredFields, {
                fields: Object.keys(profileData),
                missingFields: requiredFields.filter(f => !(f in profileData))
            });
            
            // Test profile update
            const updateData = {
                full_name: 'Integration Test User',
                company_name: 'Test Company'
            };
            
            const updateResponse = await fetch(`${SERVER_URL}/api/profile`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            
            if (updateResponse.ok) {
                const updatedProfile = await updateResponse.json();
                const updateSuccess = updatedProfile.full_name === updateData.full_name;
                logTestResult('Profile Update', updateSuccess, {
                    sentName: updateData.full_name,
                    receivedName: updatedProfile.full_name
                });
            } else {
                logTestResult('Profile Update', false, { status: updateResponse.status });
            }
        } else {
            logTestResult('Profile Retrieval', false, { status: getResponse.status });
        }
    } catch (error) {
        logTestResult('Profile Operations', false, { error: error.message });
    }
}

// Report generation test
async function testReportGeneration() {
    log('Testing Report Generation', 'info');
    
    try {
        // Create test video
        log('Creating test video...', 'info');
        await createTestVideo();
        
        // Create form data
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('video', fs.createReadStream(TEST_VIDEO_PATH), 'test-video.mp4');
        formData.append('customer', 'Test Customer');
        formData.append('project', 'Integration Test Project');
        formData.append('useGemini', 'false');
        
        log('Uploading video and generating report...', 'info');
        const response = await fetch(`${SERVER_URL}/api/generate-report`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                ...formData.getHeaders()
            },
            body: formData
        });
        
        if (response.ok) {
            const reportData = await response.json();
            
            // Validate response structure
            const expectedFields = ['reportKey', 's3ReportJsonKey', 'message'];
            const hasExpectedFields = expectedFields.every(field => field in reportData);
            
            logTestResult('Report Generation', hasExpectedFields, {
                receivedFields: Object.keys(reportData),
                reportKey: reportData.reportKey,
                hasS3Key: !!reportData.s3ReportJsonKey
            });
            
            // Test if we can retrieve the generated report
            if (reportData.s3ReportJsonKey) {
                const assetResponse = await fetch(
                    `${SERVER_URL}/assets/view-s3-asset?key=${encodeURIComponent(reportData.s3ReportJsonKey)}`,
                    { headers: { 'Authorization': `Bearer ${authToken}` } }
                );
                
                const canRetrieveAsset = assetResponse.ok;
                logTestResult('Report Asset Retrieval', canRetrieveAsset, {
                    status: assetResponse.status,
                    s3Key: reportData.s3ReportJsonKey
                });
            }
            
        } else {
            const errorText = await response.text();
            logTestResult('Report Generation', false, { 
                status: response.status, 
                error: errorText 
            });
        }
    } catch (error) {
        logTestResult('Report Generation', false, { error: error.message });
    } finally {
        // Cleanup test video
        if (fs.existsSync(TEST_VIDEO_PATH)) {
            fs.unlinkSync(TEST_VIDEO_PATH);
        }
    }
}

// Browse reports test
async function testBrowseReports() {
    log('Testing Browse Reports', 'info');
    
    try {
        const response = await fetch(`${SERVER_URL}/api/browse-reports`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const browseData = await response.json();
            
            // Should be an array
            const isArray = Array.isArray(browseData);
            logTestResult('Browse Reports Structure', isArray, {
                dataType: typeof browseData,
                itemCount: isArray ? browseData.length : 0
            });
        } else {
            logTestResult('Browse Reports', false, { status: response.status });
        }
    } catch (error) {
        logTestResult('Browse Reports', false, { error: error.message });
    }
}

// Main test runner
async function runIntegrationTests() {
    log('🚀 Starting Integration Tests', 'info');
    log(`Server URL: ${SERVER_URL}`, 'info');
    
    // Check server health
    try {
        const healthResponse = await fetch(`${SERVER_URL}/health`);
        if (!healthResponse.ok) {
            log('Server is not healthy or not running', 'error');
            process.exit(1);
        }
    } catch (error) {
        log('Server is not accessible. Please ensure it is running.', 'error');
        process.exit(1);
    }
    
    // Run test suites
    const authSuccess = await testAuthentication();
    
    if (authSuccess) {
        await testProfile();
        await testReportGeneration();
        await testBrowseReports();
    } else {
        log('Authentication failed. Skipping authenticated endpoint tests.', 'error');
    }
    
    // Generate report
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    log('\n📊 Integration Test Summary', 'info');
    log(`Total Tests: ${totalTests}`, 'info');
    log(`Passed: ${passedTests}`, 'success');
    log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'info');
    log(`Success Rate: ${successRate}%`, 'info');
    
    // Save detailed results
    const reportPath = path.join(__dirname, 'integration-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: { total: totalTests, passed: passedTests, failed: failedTests, successRate },
        results: testResults
    }, null, 2));
    
    log(`\n📁 Detailed results saved to: ${reportPath}`, 'info');
    
    process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
    runIntegrationTests().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { runIntegrationTests };