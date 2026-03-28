/**
 * NeuroScanAI | Patient Records Data Management
 */

// 1. Initial Checks
checkAuth();
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderRecords();
});

// 2. Mock Data (Simulating a database)
const patientData = [
    { id: "PX-8802", name: "Shashikant Yadav", date: "Mar 24, 2026", finding: "Malignant", confidence: "92.1%", type: "malignant" },
    { id: "PX-8911", name: "Lenge Paser", date: "Mar 20, 2026", finding: "Benign", confidence: "98.4%", type: "benign" },
    { id: "PX-9003", name: "Priynshu Singh", date: "Mar 18, 2026", finding: "Malignant", confidence: "87.2%", type: "malignant" },
    { id: "PX-9122", name: "Samar Pratap Singh", date: "Mar 15, 2026", finding: "Benign", confidence: "95.0%", type: "benign" },
    { id: "PX-9920", name: "Rishab Pandey", date: "Mar 27, 2026", finding: "Pending Review", confidence: "--", type: "pending" }
];

// 3. Render Function
function renderRecords(filter = "") {
    const tbody = document.getElementById('records-body');
    tbody.innerHTML = "";

    const filtered = patientData.filter(p => 
        p.name.toLowerCase().includes(filter.toLowerCase()) || 
        p.id.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach(patient => {
        const row = `
            <tr>
                <td class="mono">${patient.id}</td>
                <td style="font-weight:600">${patient.name}</td>
                <td>${patient.date}</td>
                <td><span class="badge badge-${patient.type}">${patient.finding}</span></td>
                <td class="mono">${patient.confidence}</td>
                <td><a href="results.html" class="view-btn">View Analysis</a></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// 4. Search Implementation
document.getElementById('recordSearch').addEventListener('input', (e) => {
    renderRecords(e.target.value);
});

function logout() {
    localStorage.removeItem('neuroAuth');
    window.location.href = 'auth.html';
}

/**
 * Sidebar Profile Injector
 */
function updateSidebarUser() {
    const userData = JSON.parse(localStorage.getItem('neuroUser'));
    const nameDisplay = document.getElementById('user-display-name');
    const avatarDisplay = document.getElementById('user-avatar');

    if (userData && userData.name) {
        // 1. Set the Name
        nameDisplay.innerText = userData.name;

        // 2. Generate Initials (Ankit Kumar -> AK)
        const nameParts = userData.name.trim().split(' ');
        let initials = "";
        if (nameParts.length > 1) {
            initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
        } else {
            initials = nameParts[0][0] + (nameParts[0][1] || "");
        }
        avatarDisplay.innerText = initials.toUpperCase();
    }
}

// Ensure this runs when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateSidebarUser(); // Pull the data!
    lucide.createIcons();
    renderRecords();
});