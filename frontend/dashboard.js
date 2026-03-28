/**
 * NeuroScanAI | Diagnostic Console Logic
<<<<<<< HEAD
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
=======
 * Integrated with FastAPI /api/analyze endpoint
 */

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";   // Change to your server URL in production

// ── Initialize ────────────────────────────────────────────────────────────────
checkAuth();
lucide.createIcons();

// ── UI State References ───────────────────────────────────────────────────────
const UI = {
    userName:     document.getElementById('user-display-name'),
    clock:        document.getElementById('clock'),
    fileInput:    document.getElementById('mri-upload'),
    uploadPrompt: document.getElementById('upload-prompt'),
    overlay:      document.getElementById('analysis-overlay'),
    progressBar:  document.getElementById('analysis-progress'),
    statusBadge:  document.querySelector('.badge-waiting')
>>>>>>> origin/main
};

// Set User Name from LocalStorage
const userData = JSON.parse(localStorage.getItem('neuroUser'));
if (userData && UI.userName) {
    UI.userName.innerText = userData.name;
}

<<<<<<< HEAD
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
=======
// ── Clinical Clock ────────────────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    if (UI.clock) {
        UI.clock.innerText = now.toLocaleTimeString('en-US', {
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
>>>>>>> origin/main
}
setInterval(updateClock, 1000);
updateClock();

<<<<<<< HEAD
// 4. File Analysis Simulation
if (UI.fileInput) {
    UI.fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            startAnalysis();
=======
// ── File Listener ─────────────────────────────────────────────────────────────
if (UI.fileInput) {
    UI.fileInput.addEventListener('change', function (e) {
        if (e.target.files.length > 0) {
            runAnalysis(e.target.files[0]);
>>>>>>> origin/main
        }
    });
}

<<<<<<< HEAD
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
=======
// ── Analysis Pipeline ─────────────────────────────────────────────────────────
async function runAnalysis(file) {
    // 1. Transition UI to scanning state
    UI.uploadPrompt.style.display = 'none';
    UI.overlay.style.display      = 'flex';
    UI.overlay.style.flexDirection  = 'column';
    UI.overlay.style.alignItems     = 'center';
    UI.overlay.style.justifyContent = 'center';

    if (UI.statusBadge) {
        UI.statusBadge.innerText         = "PROCESSING";
        UI.statusBadge.style.background  = "#DBEAFE";
        UI.statusBadge.style.color       = "#2563EB";
    }

    // 2. Animate progress bar (visual feedback during API call)
    let fakeProgress = 0;
    const fakeInterval = setInterval(() => {
        // Ramp to 85% quickly, then stall waiting for API
        fakeProgress = fakeProgress < 85
            ? fakeProgress + 2
            : fakeProgress + 0.1;
        if (UI.progressBar) {
            UI.progressBar.style.width = `${Math.min(fakeProgress, 90)}%`;
        }
    }, 60);

    // 3. Call the FastAPI backend
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE}/api/analyze`, {
            method: "POST",
            body: formData
        });

        clearInterval(fakeInterval);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `Server error ${response.status}`);
        }

        const result = await response.json();

        // 4. Fill progress to 100%, store result, redirect
        if (UI.progressBar) UI.progressBar.style.width = "100%";

        // Persist result for results.html to consume
        localStorage.setItem('neuroScanResult', JSON.stringify(result));
        // Also store the original filename for display
        localStorage.setItem('neuroScanFile', file.name);

        setTimeout(() => {
            window.location.href = 'results.html';
        }, 500);

    } catch (err) {
        clearInterval(fakeInterval);
        console.error("Analysis failed:", err);

        // Gracefully show error in UI
        UI.overlay.style.display = 'none';
        UI.uploadPrompt.style.display = 'flex';

        // Show an error message inside the viewer
        const errorMsg = document.createElement('p');
        errorMsg.style.cssText = "color:#EF4444; font-weight:600; font-size:0.9rem; margin-top:1rem;";
        errorMsg.innerText = `⚠ Analysis failed: ${err.message}`;
        UI.uploadPrompt.appendChild(errorMsg);

        if (UI.statusBadge) {
            UI.statusBadge.innerText        = "ERROR";
            UI.statusBadge.style.background = "#FEF2F2";
            UI.statusBadge.style.color      = "#EF4444";
        }
    }
}

// ── Drag & Drop Support ───────────────────────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); });
    });

    dropZone.addEventListener('dragover', () => {
        dropZone.style.borderColor = 'var(--clinical-blue)';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
    });
    dropZone.addEventListener('drop', e => {
        dropZone.style.borderColor = '';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            // Sync to the hidden input so checkAuth-gated code still works
            UI.fileInput.files = files;
            runAnalysis(files[0]);
        }
    });
}

// ── Session Management ────────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('neuroAuth');
    window.location.href = 'auth.html';
}
>>>>>>> origin/main
