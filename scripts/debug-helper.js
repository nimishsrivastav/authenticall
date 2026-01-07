/**
 * Authenticall AI Debug Helper
 * Paste this into the browser console on a Google Meet page to test Phase 3 features
 */

(function() {
  console.log('🔍 Authenticall AI Debug Helper loaded\n');

  const AuthenticallDebug = {
    /**
     * Test 1: Platform Detection
     */
    testPlatform() {
      console.log('=== Test 1: Platform Detection ===');
      const url = window.location.href;
      let platform = 'Unknown';
      
      if (url.includes('meet.google.com')) platform = 'Google Meet';
      else if (url.includes('zoom.us')) platform = 'Zoom';
      else if (url.includes('teams.microsoft.com')) platform = 'Microsoft Teams';
      
      console.log('✅ Platform:', platform);
      console.log('✅ URL:', url);
      return platform;
    },

    /**
     * Test 2: Video Element Detection
     */
    testVideoDetection() {
      console.log('\n=== Test 2: Video Element Detection ===');
      const videos = document.querySelectorAll('video');
      
      console.log(`✅ Found ${videos.length} video element(s)`);
      
      videos.forEach((video, i) => {
        console.log(`Video ${i}:`, {
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
          paused: video.paused,
          currentTime: video.currentTime
        });
      });
      
      return videos;
    },

    /**
     * Test 3: Frame Extraction
     */
    async testFrameExtraction(showImage = true) {
      console.log('\n=== Test 3: Frame Extraction ===');
      
      const video = document.querySelector('video');
      if (!video) {
        console.error('❌ No video element found');
        return null;
      }

      if (video.readyState < 2) {
        console.error('❌ Video not ready');
        return null;
      }

      const startTime = performance.now();
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const maxWidth = 720;
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      canvas.width = Math.min(video.videoWidth, maxWidth);
      canvas.height = canvas.width / aspectRatio;
      
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
      
      // Draw frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      const extractionTime = performance.now() - startTime;
      
      console.log('✅ Frame extracted successfully');
      console.log('📊 Dimensions:', canvas.width, 'x', canvas.height);
      console.log('📊 Size:', Math.round(base64.length / 1024), 'KB');
      console.log('⏱️  Extraction time:', extractionTime.toFixed(2), 'ms');
      
      if (showImage) {
        // Remove old debug image if exists
        const oldImg = document.getElementById('authenticall-debug-img');
        if (oldImg) oldImg.remove();
        
        // Display frame
        const img = document.createElement('img');
        img.id = 'authenticall-debug-img';
        img.src = base64;
        img.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          width: 300px;
          border: 3px solid #6366f1;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 999999;
        `;
        document.body.appendChild(img);
        console.log('🖼️  Frame displayed in top-right corner');
      }
      
      return { base64, size: base64.length, extractionTime };
    },

    /**
     * Test 4: Caption Detection
     */
    testCaptions() {
      console.log('\n=== Test 4: Caption Detection ===');
      
      const selectors = [
        'div[class*="caption"]',
        'div[jsname="tgaKEf"]',
        'span[class*="caption-text"]',
        '[class*="closed-caption"]'
      ];
      
      let found = false;
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`✅ Selector "${selector}": ${elements.length} element(s)`);
          elements.forEach((el, i) => {
            const text = el.textContent?.trim();
            if (text) {
              console.log(`   Caption ${i}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
              found = true;
            }
          });
        }
      });
      
      if (!found) {
        console.log('⚠️  No captions found. Enable captions in Meet (CC button)');
      }
      
      return found;
    },

    /**
     * Test 5: Background Communication
     */
    async testBackgroundComm() {
      console.log('\n=== Test 5: Background Communication ===');
      
      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { type: 'PING', timestamp: Date.now() },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            }
          );
        });
        
        console.log('✅ Background worker responded:', response);
        return response;
      } catch (error) {
        console.error('❌ Background communication failed:', error);
        return null;
      }
    },

    /**
     * Test 6: Performance Simulation
     */
    testPerformance(frameCount = 10) {
      console.log('\n=== Test 6: Performance Simulation ===');
      console.log(`Simulating ${frameCount} frame captures...`);
      
      const video = document.querySelector('video');
      if (!video) {
        console.error('❌ No video element found');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      
      const times = [];
      
      for (let i = 0; i < frameCount; i++) {
        const start = performance.now();
        ctx.drawImage(video, 0, 0, 720, 480);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        const time = performance.now() - start;
        times.push(time);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log('📊 Performance Results:');
      console.log('   Average:', avgTime.toFixed(2), 'ms');
      console.log('   Min:', minTime.toFixed(2), 'ms');
      console.log('   Max:', maxTime.toFixed(2), 'ms');
      console.log('   Target: < 100ms');
      
      if (avgTime < 100) {
        console.log('✅ Performance within acceptable range');
      } else {
        console.warn('⚠️  Performance below target');
      }
      
      return { avgTime, minTime, maxTime };
    },

    /**
     * Test 7: Memory Usage
     */
    testMemory() {
      console.log('\n=== Test 7: Memory Usage ===');
      
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        const limit = performance.memory.jsHeapSizeLimit;
        
        console.log('📊 Memory Stats:');
        console.log('   Used:', Math.round(used / 1024 / 1024), 'MB');
        console.log('   Total:', Math.round(total / 1024 / 1024), 'MB');
        console.log('   Limit:', Math.round(limit / 1024 / 1024), 'MB');
        console.log('   Usage:', ((used / limit) * 100).toFixed(2), '%');
        
        return { used, total, limit, percentage: (used / limit) * 100 };
      } else {
        console.log('⚠️  Memory API not available');
        return null;
      }
    },

    /**
     * Run all tests
     */
    async runAll() {
      console.log('🧪 Running All Phase 3 Tests...\n');
      
      const results = {
        platform: this.testPlatform(),
        videos: this.testVideoDetection(),
        frame: await this.testFrameExtraction(true),
        captions: this.testCaptions(),
        background: await this.testBackgroundComm(),
        performance: this.testPerformance(10),
        memory: this.testMemory()
      };
      
      console.log('\n' + '='.repeat(50));
      console.log('📋 Test Summary');
      console.log('='.repeat(50));
      console.log('Platform Detection:', results.platform !== 'Unknown' ? '✅' : '❌');
      console.log('Video Detection:', results.videos.length > 0 ? '✅' : '❌');
      console.log('Frame Extraction:', results.frame ? '✅' : '❌');
      console.log('Caption Detection:', results.captions ? '✅' : '⚠️');
      console.log('Background Comm:', results.background?.success ? '✅' : '❌');
      console.log('Performance:', results.performance.avgTime < 100 ? '✅' : '⚠️');
      console.log('Memory:', results.memory?.percentage < 80 ? '✅' : '⚠️');
      console.log('='.repeat(50));
      
      return results;
    },

    /**
     * Start continuous capture simulation
     */
    startContinuousCapture(fps = 1) {
      console.log(`\n🎥 Starting continuous capture at ${fps} FPS`);
      console.log('Run AuthenticallDebug.stopContinuousCapture() to stop\n');
      
      let frameCount = 0;
      const interval = 1000 / fps;
      
      this._captureInterval = setInterval(async () => {
        frameCount++;
        console.log(`Frame ${frameCount}:`);
        await this.testFrameExtraction(false);
      }, interval);
      
      return this._captureInterval;
    },

    /**
     * Stop continuous capture
     */
    stopContinuousCapture() {
      if (this._captureInterval) {
        clearInterval(this._captureInterval);
        console.log('✅ Continuous capture stopped');
        this._captureInterval = null;
      }
    },

    /**
     * Show help
     */
    help() {
      console.log(`
🔍 Authenticall AI Debug Helper
=============================

Available commands:

AuthenticallDebug.testPlatform()                 - Test platform detection
AuthenticallDebug.testVideoDetection()           - Find video elements
AuthenticallDebug.testFrameExtraction()          - Extract a single frame
AuthenticallDebug.testCaptions()                 - Test caption detection
AuthenticallDebug.testBackgroundComm()           - Test background communication
AuthenticallDebug.testPerformance(frameCount)    - Performance test
AuthenticallDebug.testMemory()                   - Check memory usage
AuthenticallDebug.runAll()                       - Run all tests
AuthenticallDebug.startContinuousCapture(fps)    - Start continuous capture
AuthenticallDebug.stopContinuousCapture()        - Stop continuous capture
AuthenticallDebug.help()                         - Show this help

Example:
  await AuthenticallDebug.runAll()
      `);
    }
  };

  // Make globally available
  window.AuthenticallDebug = AuthenticallDebug;

  console.log('✅ Debug helper ready!');
  console.log('📖 Type "AuthenticallDebug.help()" for available commands');
  console.log('🚀 Type "await AuthenticallDebug.runAll()" to run all tests\n');

})();