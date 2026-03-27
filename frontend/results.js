/**
 * NeuroScanAI | Diagnostic Report Logic
 */

// 1. Initial Checks
checkAuth();
lucide.createIcons();

// 2. Report Timestamp
const reportDateEl = document.getElementById('report-date');
if (reportDateEl) {
    const now = new Date();
    reportDateEl.innerText = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) + " | 14:22:08 UTC";
}

// 3. Toggle ROI Overlay
function toggleROI() {
    const roi = document.getElementById('tumor-roi');
    const btn = document.getElementById('toggleBtn');
    
    if (roi.style.display === 'none') {
        roi.style.display = 'block';
        btn.classList.add('active');
    } else {
        roi.style.display = 'none';
        btn.classList.remove('active');
    }
}

// 4. Session Termination
function logout() {
    localStorage.removeItem('neuroAuth');
    window.location.href = 'auth.html';
}