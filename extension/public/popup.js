// Popup JavaScript
let isMonitoring = false;

const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');
const toggleBtn = document.getElementById('toggleBtn');
const infoText = document.getElementById('infoText');

// Check current status when popup opens
async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'GET_CURRENT_STATE' 
    });
    
    if (response?.success) {
      const state = response.data?.monitoring?.state;
      isMonitoring = state === 'ACTIVE';
      updateUI();
    }
  } catch (err) {
    console.error('Error checking status:', err);
  }
}

// Update UI based on monitoring state
function updateUI() {
  if (isMonitoring) {
    statusDiv.className = 'status active';
    statusText.textContent = 'Monitoring Active';
    toggleBtn.className = 'stop';
    toggleBtn.textContent = 'Stop Monitoring';
    infoText.textContent = '🔍 Analyzing video and audio...';
  } else {
    statusDiv.className = 'status idle';
    statusText.textContent = 'Idle';
    toggleBtn.className = 'start';
    toggleBtn.textContent = 'Start Monitoring';
    infoText.textContent = 'Enable captions in Meet for best results';
  }
}

// Toggle monitoring
async function toggleMonitoring() {
  toggleBtn.disabled = true;
  
  try {
    const messageType = isMonitoring ? 'STOP_MONITORING' : 'START_MONITORING';
    
    const response = await chrome.runtime.sendMessage({ 
      type: messageType 
    });
    
    if (response?.success) {
      isMonitoring = !isMonitoring;
      updateUI();
      
      // Show feedback
      if (isMonitoring) {
        infoText.textContent = '✅ Monitoring started!';
      } else {
        infoText.textContent = '✅ Monitoring stopped!';
      }
      
      setTimeout(() => updateUI(), 2000);
    } else {
      alert('Error: ' + (response?.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    toggleBtn.disabled = false;
  }
}

// Event listeners
toggleBtn.addEventListener('click', toggleMonitoring);

// Check status on load
checkStatus();