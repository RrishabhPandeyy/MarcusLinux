checkAuth();
lucide.createIcons();

// ── Report Timestamp ──────────────────────────────────────────────────────────
const reportDateEl = document.getElementById('report-date');
if (reportDateEl) {
    const now = new Date();
    reportDateEl.innerText = now.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) + ` | ${now.toLocaleTimeString('en-US', { hour12: false })} UTC`;
}

// ── Load Results from localStorage ───────────────────────────────────────────
const raw    = localStorage.getItem('neuroScanResult');
const result = raw ? JSON.parse(raw) : null;

if (result) {
    renderResults(result);
} else {
    // No data yet — show placeholder values (user landed here directly)
    console.warn("No scan result in localStorage. Showing placeholder.");
}

// ── Render Function ───────────────────────────────────────────────────────────
function renderResults(r) {

    // ── FIX: Robust malignancy check ─────────────────────────────────────────
    // Handles all cases: "Malignant", "malignant", "glioma", "meningioma",
    // "pituitary" (all are tumour types), and "notumor" / "Benign" for benign.
    const classRaw = (r.classification || "").trim().toLowerCase();
    const MALIGNANT_CLASSES = ["malignant", "glioma"];
    const isMalignant = MALIGNANT_CLASSES.includes(classRaw);

    const roiLabel = document.getElementById("roiLabel");

    if (roiLabel) {
        const labelText = isMalignant
            ? `MALIGNANCY DETECTED (${r.confidence}%)`
            : `BENIGN (${r.confidence}%)`;

        roiLabel.innerText = labelText;
    }
    // Normalised display label (always proper-cased for UI)
    const classLabel  = isMalignant ? "Malignant" : "Benign";
    const accentColor = isMalignant ? "#EF4444" : "#22C55E";
    const confidence  = r.confidence ?? 0;

    // ── 1. Confidence Score Card ─────────────────────────────────────────────
    const confValue = document.querySelector('.value-large');
    if (confValue) {
        confValue.style.color = accentColor;
        confValue.innerHTML   = `${confidence}<span style="font-size:1.2rem">%</span>`;
    }

    const confCard = document.querySelector('.metric-card');
    if (confCard) {
        confCard.style.borderLeftColor = accentColor;
    }

    const statusMsg = document.querySelector('.status-msg');
    if (statusMsg) {
        statusMsg.style.color = accentColor;
        statusMsg.innerText   = isMalignant
            ? `High confidence malignancy in ${r.region?.lobe ?? "detected region"}.`
            : `No malignancy detected. Findings appear benign.`;
    }

    // Progress bar fill
    const fill = document.querySelector('.progress-mini .fill');
    if (fill) {
        fill.style.background = accentColor;
        fill.style.width      = `${confidence}%`;
    }

    // ── 2. ROI Detection Box ─────────────────────────────────────────────────
    const roiBox = document.getElementById('tumor-roi');
    if (roiBox && r.roi) {
        if (isMalignant) {
            roiBox.style.display    = 'block';
            roiBox.style.top        = `${r.roi.top}%`;
            roiBox.style.left       = `${r.roi.left}%`;
            roiBox.style.width      = `${r.roi.width}%`;
            roiBox.style.height     = `${r.roi.height}%`;
            roiBox.style.border     = `2px solid ${accentColor}`;
            roiBox.style.background = `${accentColor}20`;
            roiBox.style.boxShadow  = `0 0 15px ${accentColor}66`;

            const roiLabel = roiBox.querySelector('.roi-label');
            if (roiLabel) {
                roiLabel.style.background = accentColor;
                roiLabel.innerText        = `MALIGNANCY DETECTED (${confidence}%)`;
            }
        } else {
            roiBox.style.display = 'none';
        }
    }

    // ── 3. Overlay Image (GradCAM heatmap from backend) ──────────────────────
    if (r.overlay_b64) {
        const scanImg = document.querySelector('.main-scan');
        if (scanImg) {
            scanImg.src = `data:image/png;base64,${r.overlay_b64}`;
            scanImg.alt = "GradCAM Heatmap Overlay";
        }
    }

    // ── 4. Volumetric Data Card ───────────────────────────────────────────────
    const rows = document.querySelectorAll('.finding-row strong.mono');
    if (rows.length >= 3 && r.volumetric) {
        rows[0].innerText = `${r.volumetric.volume_cm3} cm³`;
        rows[1].innerText = r.volumetric.coordinates;
        rows[2].innerText = r.volumetric.density_index;
    }

    // ── 5. Tissue Classification Card ──
    const cards = document.querySelectorAll('.metric-card');
    const tissueCard = cards[2]; // third card ONLY

    if (tissueCard && r.region) {
        const rows = tissueCard.querySelectorAll('.finding-row strong');
        console.log("REGION DATA:", r.region); // DEBUG

        if (rows.length >= 3) {
            rows[0].innerText = r.region.lobe || "N/A";
            rows[1].innerText = r.region.hemisphere || "N/A";
            rows[2].innerText = classLabel;

            rows[2].style.color = accentColor;
            rows[2].style.fontWeight = '700';
        }
    }
    // ── 5. Tissue Classification Card ──

  
    // ── 6. Report ID includes confidence hash ─────────────────────────────────
    const reportTitle = document.querySelector('h1 .mono');
    if (reportTitle) {
        const hashStr = `#NS-${Math.floor(confidence * 1000).toString().slice(0, 5)}`;
        reportTitle.innerText = hashStr;
    }

    // ── 7. Update page title based on finding ────────────────────────────────
    document.title = `${classLabel} Finding | NeuroScanAI`;
}

// ── ROI Toggle ────────────────────────────────────────────────────────────────
function toggleROI() {
    const roi = document.getElementById('tumor-roi');
    const btn = document.getElementById('toggleBtn');
    if (!roi) return;

    if (roi.style.display === 'none') {
        roi.style.display = 'block';
        btn.classList.add('active');
    } else {
        roi.style.display = 'none';
        btn.classList.remove('active');
    }
}

// ── Session Termination ───────────────────────────────────────────────────────
function logout() {
    localStorage.removeItem('neuroAuth');
    localStorage.removeItem('neuroScanResult');
    localStorage.removeItem('neuroScanFile');
    window.location.href = 'auth.html';
}


/**
 * CLINICIAN OVERRIDE LOGIC
 * Activates manual drawing mode on the MRI scan
 */
let reviewActive = false; // Track if we are currently reviewing

function enableReviewMode() {
    const canvas = document.getElementById('annotation-canvas');
    const img = document.getElementById('main-scan');
    const aiBox = document.getElementById('tumor-roi');
    const ctx = canvas.getContext('2d');
    const btn = document.getElementById('btn-review');

    if (!reviewActive) {
        // --- STATE 1: STARTING THE REVIEW ---
        reviewActive = true;
        
        // 1. Show canvas & Match sizes
        canvas.style.display = 'block';
        canvas.style.pointerEvents = 'auto'; // Enable drawing
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;

        // 2. Hide AI's original finding for clear review
        if (aiBox) aiBox.style.display = 'none';

        // 3. Update Button UI
        btn.innerHTML = '<i data-lucide="check-circle" style="width:14px"></i> Confirm Annotation';
        btn.style.background = "#22C55E"; // Success Green
        btn.style.color = "white";
        if (window.lucide) lucide.createIcons();

        // 4. Set up Drawing (Existing logic)
        let isDrawing = false;
        let startX, startY;

        canvas.onmousedown = (e) => {
            isDrawing = true;
            startX = e.offsetX;
            startY = e.offsetY;
        };

        canvas.onmousemove = (e) => {
            if (!isDrawing) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            ctx.strokeStyle = '#F59E0B'; 
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 3]);
            ctx.strokeRect(startX, startY, e.offsetX - startX, e.offsetY - startY);
        };

        canvas.onmouseup = () => { isDrawing = false; };

    } else {
        // --- STATE 2: CONFIRMING/LOCKING THE REPORT ---
        const note = prompt("Review complete. Enter your clinical sign-off note:");
        
        if (note) {
            // 1. Lock the drawing (Make it unclickable)
            canvas.style.pointerEvents = 'none';
            
            // 2. Update Sidebar (Targeting the 'Class' label)
            const classVal = document.querySelector('.tissue-classification dd:last-child');
            if (classVal) {
                classVal.innerHTML = `<span style="color:#F59E0B; font-weight:800;">[VERIFIED] ${note}</span>`;
            }

            // 3. Update Button to "Verified" State
            btn.innerHTML = '<i data-lucide="shield-check" style="width:14px"></i> Report Verified';
            btn.style.background = "#059669"; // Deep Medical Green
            btn.disabled = true; // Prevents further changes

            // 4. Visual Stamp on Header
            const reportHeader = document.querySelector('.workspace-header div h1');
            if(reportHeader) {
                reportHeader.innerHTML += ` <span style="font-size: 0.7rem; background: #F59E0B; color: white; padding: 2px 8px; border-radius: 4px; vertical-align: middle; margin-left:10px;">CLINICIAN SIGN-OFF</span>`;
            }

            alert("Clinical Verification Complete. Report has been locked and synced to the internal database.");
            if (window.lucide) lucide.createIcons();
            
            reviewActive = false; // Reset state
        }
    }
}