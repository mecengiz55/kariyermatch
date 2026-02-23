// ── KariyerMatch - SPA Router & App Controller ──
import { getUser, getToken, removeToken, removeUser } from './api.js';
import { renderHome } from './pages/home.js';
import { renderLogin, renderRegister } from './pages/auth.js';
import { renderJobs } from './pages/jobs.js';
import { renderJobDetail } from './pages/job-detail.js';
import { renderStudentDashboard } from './pages/dashboard-student.js';
import { renderEmployerDashboard } from './pages/dashboard-employer.js';
import { renderProfile } from './pages/profile.js';

const app = document.getElementById('app');
const navLinks = document.getElementById('navLinks');
const navActions = document.getElementById('navActions');
const navbar = document.getElementById('navbar');

// ── Toast System ──
export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ── Navigation Update ──
function updateNav() {
    const user = getUser();
    const currentHash = window.location.hash;

    if (user) {
        const dashLabel = user.role === 'student' ? '📊 Dashboard' : '🏢 Dashboard';
        navLinks.innerHTML = `
      <li><a href="#/" data-page="home" ${currentHash === '#/' || currentHash === '' ? 'class="active"' : ''}>Ana Sayfa</a></li>
      <li><a href="#/jobs" data-page="jobs" ${currentHash.startsWith('#/jobs') ? 'class="active"' : ''}>İlanlar</a></li>
      <li><a href="#/dashboard" data-page="dashboard" ${currentHash.startsWith('#/dashboard') ? 'class="active"' : ''}>${dashLabel}</a></li>
    `;
        navActions.innerHTML = `
      <span style="color: var(--text-secondary); font-size: var(--font-sm);">👋 ${user.fullName}</span>
      <button class="btn btn-secondary btn-sm" id="logoutBtn">Çıkış</button>
    `;
        document.getElementById('logoutBtn').addEventListener('click', logout);
    } else {
        navLinks.innerHTML = `
      <li><a href="#/" data-page="home" ${currentHash === '#/' || currentHash === '' ? 'class="active"' : ''}>Ana Sayfa</a></li>
      <li><a href="#/jobs" data-page="jobs" ${currentHash.startsWith('#/jobs') ? 'class="active"' : ''}>İlanlar</a></li>
    `;
        navActions.innerHTML = `
      <a href="#/login" class="btn btn-secondary btn-sm">Giriş Yap</a>
      <a href="#/register" class="btn btn-primary btn-sm">Kayıt Ol</a>
    `;
    }
}

function logout() {
    removeToken();
    removeUser();
    showToast('Çıkış yapıldı', 'success');
    window.location.hash = '#/';
}

// ── Router ──
async function router() {
    const hash = window.location.hash || '#/';
    const [path, queryStr] = hash.slice(1).split('?');
    const params = new URLSearchParams(queryStr || '');

    // Clear page
    app.innerHTML = '<div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update nav
    updateNav();

    // Route matching
    try {
        if (path === '/' || path === '') {
            await renderHome(app);
        } else if (path === '/login') {
            renderLogin(app);
        } else if (path === '/register') {
            renderRegister(app);
        } else if (path === '/jobs' || path === '/jobs/') {
            await renderJobs(app, params);
        } else if (path.match(/^\/jobs\/\d+$/)) {
            const jobId = path.split('/')[2];
            await renderJobDetail(app, jobId);
        } else if (path === '/dashboard') {
            const user = getUser();
            if (!user) {
                window.location.hash = '#/login';
                return;
            }
            if (user.role === 'student') {
                await renderStudentDashboard(app);
            } else {
                await renderEmployerDashboard(app);
            }
        } else if (path === '/profile') {
            const user = getUser();
            if (!user) {
                window.location.hash = '#/login';
                return;
            }
            await renderProfile(app);
        } else {
            app.innerHTML = `
        <div class="container" style="text-align:center;padding:6rem 0;">
          <h1 style="font-size:4rem;margin-bottom:1rem;">404</h1>
          <p style="color:var(--text-secondary);margin-bottom:2rem;">Sayfa bulunamadı</p>
          <a href="#/" class="btn btn-primary">Ana Sayfaya Dön</a>
        </div>
      `;
        }
    } catch (error) {
        console.error('Router error:', error);
        app.innerHTML = `
      <div class="container" style="text-align:center;padding:6rem 0;">
        <h1 style="margin-bottom:1rem;">⚠️ Hata</h1>
        <p style="color:var(--text-secondary);margin-bottom:2rem;">${error.message}</p>
        <a href="#/" class="btn btn-primary">Ana Sayfaya Dön</a>
      </div>
    `;
    }
}

// ── Navbar Scroll Effect ──
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ── Mobile Menu ──
document.getElementById('menuBtn').addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '72px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'rgba(10,14,26,0.95)';
    navLinks.style.padding = '1rem';
    navLinks.style.borderBottom = '1px solid var(--border-color)';
});

// ── Init ──
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

// Make showToast globally available
window.showToast = showToast;
