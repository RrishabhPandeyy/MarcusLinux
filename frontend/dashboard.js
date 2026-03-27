/**
 * NeuroScanAI | Diagnostic Console Logic
 * Expert Frontend Developer / Medical UI/UX
 */

// 1. Initialize Gatekeeper & Icons
checkAuth();
lucide.createIcons();

// 2. Local State Management
const UI = {
    userName: document.getElementById('user-display-name'),
    clock: document.getElementById('clock'),
    fileInput: document.getElementById('mri-upload'),
    uploadPrompt: document.getElementById('upload-prompt'),
    overlay: document.getElementById('analysis-overlay'),
    progressBar: document.getElementById('analysis-progress'),
    statusBadge: document.querySelector('.badge-waiting')
};

// Set User Name from LocalStorage
const userData = JSON.parse(localStorage.getItem('neuroUser'));
if (userData && UI.userName) {
    UI.userName.innerText = userData.name;
}

// 3. Clinical Clock Logic
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    if (UI.clock) UI.clock.innerText = timeString;
}
setInterval(updateClock, 1000);
updateClock();

// 4. File Analysis Simulation
if (UI.fileInput) {
    UI.fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            startAnalysis();
        }
    });
}

function startAnalysis() {
    // UI Transitions
    UI.uploadPrompt.style.display = 'none';
    UI.overlay.style.display = 'flex';
    UI.overlay.style.flexDirection = 'column';
    UI.overlay.style.alignItems = 'center';
    UI.overlay.style.justifyContent = 'center';
    
    // Update Metadata Status
    if (UI.statusBadge) {
        UI.statusBadge.innerText = "PROCESSING";
        UI.statusBadge.style.background = "#DBEAFE";
        UI.statusBadge.style.color = "#2563EB";
    }

    let progress = 0;
    const duration = 3000; // 3 seconds for realistic AI "thinking" time
    const intervalTime = 30;
    const step = 100 / (duration / intervalTime);

    const scanInterval = setInterval(() => {
        progress += step;
        if (UI.progressBar) {
            UI.progressBar.style.width = `${Math.min(progress, 100)}%`;
        }

        if (progress >= 100) {
            clearInterval(scanInterval);
            // Small delay for the "Success" feeling before redirect
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 500);
        }
    }, intervalTime);
}

// 5. Session Management
function logout() {
    localStorage.removeItem('neuroAuth');
    window.location.href = 'login.html';
}

// 6. Handle Drag and Drop (Standard for medical apps)
const dropZone = document.getElementById('drop-zone');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        UI.fileInput.files = files;
        startAnalysis();
    }
});