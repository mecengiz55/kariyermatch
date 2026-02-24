// ── KariyerMatch - SPA Router & App Controller ──
import { getUser, getToken, removeToken, removeUser, notificationsAPI } from './api.js';
import { renderHome } from './pages/home.js';
import { renderLogin, renderRegister } from './pages/auth.js';
import { renderJobs } from './pages/jobs.js';
import { renderJobDetail } from './pages/job-detail.js';
import { renderStudentDashboard } from './pages/dashboard-student.js';
import { renderEmployerDashboard } from './pages/dashboard-employer.js';
import { renderProfile } from './pages/profile.js';
import { renderAdmin } from './pages/admin.js';

const app = document.getElementById('app');
const navLinks = document.getElementById('navLinks');
const navActions = document.getElementById('navActions');
const navbar = document.getElementById('navbar');

let notifInterval = null;

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

// ── Notification System ──
async function fetchUnreadCount() {
    try {
        const data = await notificationsAPI.unreadCount();
        updateNotifBadge(data.count);
    } catch (e) { /* ignore */ }
}

function updateNotifBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.add('visible');
    } else {
        badge.classList.remove('visible');
    }
}

async function toggleNotifDropdown() {
    let dropdown = document.getElementById('notifDropdown');

    // If dropdown is open, close it
    if (dropdown && dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        setTimeout(() => dropdown.remove(), 200);
        return;
    }

    // Remove existing
    if (dropdown) dropdown.remove();

    // Create dropdown
    dropdown = document.createElement('div');
    dropdown.id = 'notifDropdown';
    dropdown.className = 'notification-dropdown open';
    dropdown.innerHTML = `
    <div class="notif-dropdown-header">
      <h4>🔔 Bildirimler</h4>
      <button class="btn btn-ghost btn-sm" id="markAllReadBtn" title="Tümünü okundu yap">✓ Tümü</button>
    </div>
    <div class="notif-dropdown-body" id="notifDropdownBody">
      <div style="display:flex;justify-content:center;padding:2rem;"><div class="spinner"></div></div>
    </div>
  `;

    document.getElementById('notifBellWrapper').appendChild(dropdown);

    // Close when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeDropdownOutside);
    }, 10);

    // Load notifications
    try {
        const data = await notificationsAPI.list();
        const notifications = data.notifications || [];
        const body = document.getElementById('notifDropdownBody');

        if (notifications.length === 0) {
            body.innerHTML = `
        <div class="notif-empty">
          <span style="font-size:2rem;">🔔</span>
          <p>Henüz bildirim yok</p>
        </div>
      `;
        } else {
            body.innerHTML = notifications.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" data-link="${n.link || ''}">
          <div class="notif-item-icon">${getNotifIcon(n.type)}</div>
          <div class="notif-item-content">
            <div class="notif-item-title">${n.title}</div>
            <div class="notif-item-message">${n.message || ''}</div>
            <div class="notif-item-time">${getTimeAgo(n.created_at)}</div>
          </div>
          ${!n.is_read ? '<div class="notif-item-dot"></div>' : ''}
        </div>
      `).join('');

            // Click on notification item
            body.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const id = item.dataset.id;
                    const link = item.dataset.link;
                    try { await notificationsAPI.markRead(id); } catch (e) { /* */ }
                    item.classList.remove('unread');
                    item.querySelector('.notif-item-dot')?.remove();
                    if (link) {
                        closeNotifDropdown();
                        window.location.hash = link;
                    }
                    fetchUnreadCount();
                });
            });
        }

        // Mark all read
        document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
            try {
                await notificationsAPI.markAllRead();
                body.querySelectorAll('.notif-item').forEach(item => {
                    item.classList.remove('unread');
                    item.querySelector('.notif-item-dot')?.remove();
                });
                updateNotifBadge(0);
                showToast('Tüm bildirimler okundu', 'success');
            } catch (e) { showToast('Hata oluştu', 'error'); }
        });
    } catch (error) {
        document.getElementById('notifDropdownBody').innerHTML = `
      <div class="notif-empty"><p>Bildirimler yüklenemedi</p></div>
    `;
    }
}

function closeDropdownOutside(e) {
    const wrapper = document.getElementById('notifBellWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        closeNotifDropdown();
    }
}

function closeNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
        setTimeout(() => dropdown.remove(), 200);
    }
    document.removeEventListener('click', closeDropdownOutside);
}

function getNotifIcon(type) {
    const icons = {
        'new_application': '📩',
        'application_status': '📋',
        'new_job': '💼',
        'new_match': '🎯',
    };
    return icons[type] || '🔔';
}

function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins}dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}g önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR');
}

function startNotifPolling() {
    if (notifInterval) clearInterval(notifInterval);
    fetchUnreadCount();
    notifInterval = setInterval(fetchUnreadCount, 60000);
}

function stopNotifPolling() {
    if (notifInterval) {
        clearInterval(notifInterval);
        notifInterval = null;
    }
}

// ── Navigation Update ──
function updateNav() {
    const user = getUser();
    const currentHash = window.location.hash;

    if (user) {
        const dashLabel = user.role === 'student' ? '📊 Dashboard' : user.role === 'admin' ? '🛡️ Admin' : '🏢 Dashboard';
        const dashLink = user.role === 'admin' ? '#/admin' : '#/dashboard';
        navLinks.innerHTML = `
      <li><a href="#/" data-page="home" ${currentHash === '#/' || currentHash === '' ? 'class="active"' : ''}>Ana Sayfa</a></li>
      <li><a href="#/jobs" data-page="jobs" ${currentHash.startsWith('#/jobs') ? 'class="active"' : ''}>İlanlar</a></li>
      <li><a href="${dashLink}" data-page="dashboard" ${currentHash.startsWith('#/dashboard') || currentHash.startsWith('#/admin') ? 'class="active"' : ''}>${dashLabel}</a></li>
    `;
        navActions.innerHTML = `
      <div class="notification-bell-wrapper" id="notifBellWrapper">
        <button class="notification-bell" id="notifBellBtn" aria-label="Bildirimler">
          🔔
          <span class="notification-badge" id="notifBadge"></span>
        </button>
      </div>
      <span style="color: var(--text-secondary); font-size: var(--font-sm);">👋 ${user.fullName}</span>
      <button class="btn btn-secondary btn-sm" id="logoutBtn">Çıkış</button>
    `;
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('notifBellBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotifDropdown();
        });
        startNotifPolling();
    } else {
        stopNotifPolling();
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
    stopNotifPolling();
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

    // Close notification dropdown on navigate
    closeNotifDropdown();

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
        } else if (path === '/admin') {
            const user = getUser();
            if (!user || user.role !== 'admin') {
                window.location.hash = '#/';
                return;
            }
            await renderAdmin(app);
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
