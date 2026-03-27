// Security Gatekeeper
checkAuth();
lucide.createIcons();

// Set Current Date
document.getElementById('report-date').innerText = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// Toggle ROI Overlay
function toggleROI() {
    const roi = document.getElementById('tumor-roi');
    const btn = document.querySelector('.control-btn');
    
    if (roi.style.opacity === '0') {
        roi.style.opacity = '1';
        btn.classList.add('active');
    } else {
        roi.style.opacity = '0';
        btn.classList.remove('active');
    }
}

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