/**
 * NeuroScanAI | Security & Auth Master Controller
 * Refreshed for strict form handling and Safari compatibility
 */

// 1. DOM INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    console.log("NeuroScan Security Engine: Online");
});

// 2. THE GATEKEEPER
// Call this at the top of internal pages
function checkAuth() {
    if (localStorage.getItem('neuroAuth') !== 'true') {
        window.location.href = 'auth.html';
    }
}

// 3. UI TOGGLE MECHANISM
function toggleAuth(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const errorBanner = document.getElementById('auth-error');

    if (errorBanner) errorBanner.style.display = 'none';

    if (mode === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        title.innerText = "Request Access";
        subtitle.innerText = "Register your medical department";
    } else {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        title.innerText = "Clinician Login";
        subtitle.innerText = "Authorized Personnel Access Only";
    }
}

// 4. SIGNUP LOGIC (Fixed Refresh Bug)
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
        // Critical: Stop the browser from refreshing
        e.preventDefault();
        e.stopPropagation();

        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;

        const newUser = {
            name: name,
            email: email,
            pass: pass
        };

        // Save to browser "Database"
        localStorage.setItem('neuroUser', JSON.stringify(newUser));
        
        console.log("Credentials Cached for:", email);
        alert('Institutional Access Granted. Redirecting to Terminal...');
        
        // Success: Auto-Authorize the session
        localStorage.setItem('neuroAuth', 'true');
        window.location.href = 'dashboard.html';
    });
}

// 5. LOGIN LOGIC
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        
        // Pull the registered user from memory
        const storedUser = JSON.parse(localStorage.getItem('neuroUser'));

        if (storedUser && email === storedUser.email && pass === storedUser.pass) {
            // Success: Unlock the Gate
            localStorage.setItem('neuroAuth', 'true');
            window.location.href = 'dashboard.html';
        } else {
            // Failure: Trigger Visual Alert
            const errorBanner = document.getElementById('auth-error');
            const card = document.getElementById('auth-card');
            
            if (errorBanner) errorBanner.style.display = 'flex';
            if (card) {
                card.classList.add('error-shake');
                setTimeout(() => card.classList.remove('error-shake'), 400);
            }
        }
        return false;
    });
}

// 6. SESSION TERMINATION
function logout() {
    localStorage.removeItem('neuroAuth');
    window.location.href = 'auth.html';
}


