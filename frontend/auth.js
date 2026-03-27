/**
 * NeuroScanAI | Unified Security Gatekeeper & Auth Controller
 * Expert Frontend Developer / Medical UI Logic
 */

// 1. INITIALIZE ICONS
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// 2. THE GATEKEEPER (Crucial for Dashboard Security)
// Call this at the TOP of dashboard.html, records.html, results.html
function checkAuth() {
    const isAuth = localStorage.getItem('neuroAuth');
    if (isAuth !== 'true') {
        // Redirect to auth page if not logged in
        window.location.href = 'auth.html';
    }
}

// 3. UI TOGGLE MECHANISM (Login <-> Signup)
function toggleAuth(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const errorBanner = document.getElementById('auth-error');

    // Reset error state on toggle
    if (errorBanner) errorBanner.style.display = 'none';

    if (mode === 'signup') {
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
        if (title) title.innerText = "Request Access";
        if (subtitle) subtitle.innerText = "Register your medical department";
    } else {
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
        if (title) title.innerText = "Clinician Login";
        if (subtitle) subtitle.innerText = "Authorized Personnel Access Only";
    }
}

// 4. REGISTRATION LOGIC
const signupFormElement = document.getElementById('signup-form');
if (signupFormElement) {
    signupFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newUser = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            pass: document.getElementById('reg-pass').value
        };

        // Save user to LocalStorage "Database"
        localStorage.setItem('neuroUser', JSON.stringify(newUser));
        
        // Visual Feedback
        alert('Institutional credentials generated successfully. Redirecting to Login...');
        toggleAuth('login');
    });
}

// 5. LOGIN LOGIC
const loginFormElement = document.getElementById('login-form');
if (loginFormElement) {
    loginFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('login-email').value;
        const passInput = document.getElementById('login-pass').value;
        
        // Retrieve the registered user
        const storedUser = JSON.parse(localStorage.getItem('neuroUser'));

        if (storedUser && emailInput === storedUser.email && passInput === storedUser.pass) {
            // SUCCESS: Grant Session Access
            localStorage.setItem('neuroAuth', 'true');
            window.location.href = 'dashboard.html';
        } else {
            // FAILURE: Trigger Security Alert
            const errorBanner = document.getElementById('auth-error');
            const card = document.getElementById('auth-card');
            
            if (errorBanner) {
                errorBanner.style.display = 'flex';
                errorBanner.style.alignItems = 'center';
                errorBanner.style.justifyContent = 'center';
            }
            
            // Shake animation for polish
            if (card) {
                card.classList.add('error-shake');
                setTimeout(() => card.classList.remove('error-shake'), 400);
            }
        }
    });
}

// 6. SESSION TERMINATION (Logout)
function logout() {
    localStorage.removeItem('neuroAuth');
    window.location.href = 'auth.html';
}