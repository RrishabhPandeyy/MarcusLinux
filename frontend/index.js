// Initialize Lucide Icons
lucide.createIcons();

// Scroll Effects
window.addEventListener('scroll', () => {
    const nav = document.getElementById('mainNav');
    if (window.scrollY > 40) {
        nav.style.padding = '0.8rem 8%';
        nav.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)';
    } else {
        nav.style.padding = '1.2rem 8%';
        nav.style.boxShadow = 'none';
    }
});