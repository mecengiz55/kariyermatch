// ── Student Dashboard ──
import { studentsAPI, matchAPI, applicationsAPI, notificationsAPI, getUser } from '../api.js';
import { getTimeAgo } from './jobs.js';

export async function renderStudentDashboard(container) {
  const user = getUser();

  container.innerHTML = `
    <div class="container">
      <div class="dashboard">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div class="card" style="margin-bottom:var(--space-4);">
            <div style="text-align:center;">
              <div class="profile-avatar" style="width:64px;height:64px;font-size:var(--font-2xl);margin:0 auto var(--space-3);">
                ${(user.fullName || 'K')[0].toUpperCase()}
              </div>
              <h3 style="font-size:var(--font-base);font-weight:700;">${user.fullName}</h3>
              <p class="text-sm text-muted">Öğrenci</p>
              <a href="#/profile" class="btn btn-secondary btn-sm w-full" style="margin-top:var(--space-3);">Profili Düzenle</a>
            </div>
          </div>
          <div class="card">
            <ul class="sidebar-nav">
              <li><a href="javascript:void(0)" class="active" data-tab="overview">📊 Genel Bakış</a></li>
              <li><a href="javascript:void(0)" data-tab="matches">🎯 Eşleşmeler</a></li>
              <li><a href="javascript:void(0)" data-tab="applications">📋 Başvurularım</a></li>
              <li><a href="javascript:void(0)" data-tab="skills">⚡ Becerilerim</a></li>
              <li><a href="javascript:void(0)" data-tab="notifications">🔔 Bildirimler</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main -->
        <div class="dashboard-main" id="dashContent">
          <div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  // Tab navigation
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      e.target.classList.add('active');
      const tab = e.target.dataset.tab;
      loadTab(tab);
    });
  });

  // Load default tab
  loadTab('overview');
}

async function loadTab(tab) {
  const content = document.getElementById('dashContent');
  content.innerHTML = '<div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>';

  switch (tab) {
    case 'overview': await renderOverview(content); break;
    case 'matches': await renderMatches(content); break;
    case 'applications': await renderApplications(content); break;
    case 'skills': await renderSkills(content); break;
    case 'notifications': await renderNotifications(content); break;
  }
}

async function renderOverview(content) {
  let profile = null;
  let matches = [];
  let applications = [];

  try {
    const pData = await studentsAPI.getProfile();
    profile = pData.profile;
  } catch (e) { /* demo */ }

  try {
    const mData = await matchAPI.getMatchedJobs();
    matches = mData.matches || [];
  } catch (e) { /* demo */ }

  try {
    const aData = await applicationsAPI.myApplications();
    applications = aData.applications || [];
  } catch (e) { /* demo */ }

  const skillCount = profile?.skills?.length || 0;
  const matchCount = matches.length;
  const appCount = applications.length;
  const profileComplete = getProfileCompletion(profile);

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>📊 Genel Bakış</h1>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-value">${skillCount}</div>
        <div class="stat-card-label">Beceri</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${matchCount}</div>
        <div class="stat-card-label">Eşleşme</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${appCount}</div>
        <div class="stat-card-label">Başvuru</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">%${profileComplete}</div>
        <div class="stat-card-label">Profil Tamamlanma</div>
      </div>
    </div>

    ${profileComplete < 100 ? `
      <div class="card" style="margin-bottom:var(--space-6);background:rgba(245,158,11,0.1);border-color:rgba(245,158,11,0.3);">
        <h3 style="margin-bottom:var(--space-2);">⚡ Profilinizi Tamamlayın</h3>
        <p style="color:var(--text-secondary);font-size:var(--font-sm);margin-bottom:var(--space-3);">
          Daha iyi eşleşmeler için profilinizi ve becerilerinizi ekleyin
        </p>
        <div style="background:var(--gray-800);border-radius:var(--radius-full);height:8px;overflow:hidden;">
          <div style="background:var(--gradient-primary);height:100%;width:${profileComplete}%;border-radius:var(--radius-full);transition:width 1s ease;"></div>
        </div>
        <a href="#/profile" class="btn btn-secondary btn-sm" style="margin-top:var(--space-3);">Profili Düzenle →</a>
      </div>
    ` : ''}

    <!-- Recent Matches -->
    <div class="card" style="margin-bottom:var(--space-6);">
      <div class="card-header">
        <h3 class="card-title">🎯 Son Eşleşmeler</h3>
        <a href="javascript:void(0)" class="btn btn-ghost btn-sm" data-show-tab="matches">Tümünü Gör →</a>
      </div>
      ${matches.length > 0 ? matches.slice(0, 3).map(m => `
        <div style="display:flex;align-items:center;gap:var(--space-4);padding:var(--space-3) 0;border-bottom:1px solid var(--border-color);cursor:pointer;" onclick="location.hash='#/jobs/${m.id}'">
          <div class="job-company-logo" style="width:40px;height:40px;font-size:var(--font-sm);">${(m.company_name || 'Ş')[0]}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:var(--font-sm);">${m.title}</div>
            <div style="color:var(--text-muted);font-size:var(--font-xs);">${m.company_name}</div>
          </div>
          <div class="badge ${m.matchScore >= 70 ? 'badge-success' : m.matchScore >= 40 ? 'badge-warning' : 'badge-error'}">
            %${m.matchScore}
          </div>
        </div>
      `).join('') : `
        <div class="empty-state" style="padding:var(--space-8);">
          <p class="text-muted">Becerilerinizi ekleyin ve eşleşmeleri görün</p>
        </div>
      `}
    </div>
  `;

  // Tab switch links
  content.querySelectorAll('[data-show-tab]').forEach(link => {
    link.addEventListener('click', () => {
      const tab = link.dataset.showTab;
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      document.querySelector(`.sidebar-nav a[data-tab="${tab}"]`).classList.add('active');
      loadTab(tab);
    });
  });
}

async function renderMatches(content) {
  let matches = [];
  try {
    const data = await matchAPI.getMatchedJobs();
    matches = data.matches || [];
  } catch (e) { /* demo */ }

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>🎯 Eşleşmeler</h1>
    </div>
    ${matches.length > 0 ? `
      <div class="jobs-grid">
        ${matches.map((m, i) => `
          <div class="job-card" onclick="location.hash='#/jobs/${m.id}'">
            <div class="job-card-header">
              <div class="job-company-logo">${(m.company_name || 'Ş')[0]}</div>
              <div class="job-card-info">
                <h3>${m.title}</h3>
                <div class="job-card-company">${m.company_name}</div>
              </div>
              <div class="badge ${m.matchScore >= 70 ? 'badge-success' : m.matchScore >= 40 ? 'badge-warning' : 'badge-error'}">
                %${m.matchScore}
              </div>
            </div>
            <div style="margin-bottom:var(--space-3);">
              ${m.matchedSkills && m.matchedSkills.length > 0 ? `<div style="margin-bottom:var(--space-2);"><span class="text-xs text-muted">Eşleşen: </span>${m.matchedSkills.map(s => `<span class="skill-tag matched">${s}</span>`).join(' ')}</div>` : ''}
              ${m.missingSkills && m.missingSkills.length > 0 ? `<div><span class="text-xs text-muted">Eksik: </span>${m.missingSkills.map(s => `<span class="skill-tag missing">${s}</span>`).join(' ')}</div>` : ''}
            </div>
            <div class="job-card-meta">
              ${m.location ? `<span>📍 ${m.location}</span>` : ''}
              ${m.is_remote ? '<span>🏠 Uzaktan</span>' : ''}
              <span>${m.type === 'internship' ? '🎓 Staj' : '💼 İş'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <h3>Henüz Eşleşme Yok</h3>
        <p>Becerilerinizi ekleyerek eşleşmeleri görebilirsiniz</p>
        <a href="#/profile" class="btn btn-primary">Beceri Ekle</a>
      </div>
    `}
  `;
}

async function renderApplications(content) {
  let applications = [];
  try {
    const data = await applicationsAPI.myApplications();
    applications = data.applications || [];
  } catch (e) { /* demo */ }

  const statusColors = {
    pending: 'badge-warning',
    reviewed: 'badge-primary',
    accepted: 'badge-success',
    rejected: 'badge-error'
  };

  const statusLabels = {
    pending: 'Beklemede',
    reviewed: 'İncelendi',
    accepted: 'Kabul Edildi',
    rejected: 'Reddedildi'
  };

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>📋 Başvurularım</h1>
    </div>
    ${applications.length > 0 ? `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Pozisyon</th>
              <th>Şirket</th>
              <th>Eşleşme</th>
              <th>Durum</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            ${applications.map(app => `
              <tr style="cursor:pointer;" onclick="location.hash='#/jobs/${app.job_id}'">
                <td style="font-weight:600;">${app.job_title}</td>
                <td>${app.company_name}</td>
                <td><span class="badge ${app.match_score >= 70 ? 'badge-success' : app.match_score >= 40 ? 'badge-warning' : 'badge-error'}">%${app.match_score || 0}</span></td>
                <td><span class="badge ${statusColors[app.status] || 'badge-primary'}">${statusLabels[app.status] || app.status}</span></td>
                <td class="text-muted">${app.applied_at ? new Date(app.applied_at).toLocaleDateString('tr-TR') : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>Henüz Başvuru Yok</h3>
        <p>İlanları inceleyerek ilk başvurunuzu yapın</p>
        <a href="#/jobs" class="btn btn-primary">İlanları Keşfet</a>
      </div>
    `}
  `;
}

async function renderSkills(content) {
  let profile = null;
  try {
    const data = await studentsAPI.getProfile();
    profile = data.profile;
  } catch (e) { /* demo */ }

  const skills = profile?.skills || [];

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>⚡ Becerilerim</h1>
      <button class="btn btn-primary btn-sm" id="addSkillBtn">+ Beceri Ekle</button>
    </div>

    <!-- Add Skill Form (hidden) -->
    <div class="card hidden" id="addSkillForm" style="margin-bottom:var(--space-6);">
      <h3 style="margin-bottom:var(--space-4);">Yeni Beceri Ekle</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Beceri Adı</label>
          <input type="text" class="form-input" id="skillNameInput" placeholder="Örn: JavaScript, Python, React...">
        </div>
        <div class="form-group">
          <label class="form-label">Yetkinlik (1-5)</label>
          <select class="form-select" id="skillLevelInput">
            <option value="1">1 - Başlangıç</option>
            <option value="2">2 - Temel</option>
            <option value="3" selected>3 - Orta</option>
            <option value="4">4 - İleri</option>
            <option value="5">5 - Uzman</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:var(--space-3);">
        <button class="btn btn-primary btn-sm" id="saveSkillBtn">Kaydet</button>
        <button class="btn btn-ghost btn-sm" id="cancelSkillBtn">İptal</button>
      </div>
    </div>

    ${skills.length > 0 ? `
      <div class="card">
        ${skills.map(skill => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--border-color);">
            <div style="display:flex;align-items:center;gap:var(--space-3);">
              <span style="font-weight:600;">${skill.skill_name}</span>
              <div class="skill-level">
                ${Array.from({ length: 5 }, (_, i) => `<span class="skill-level-dot ${i < skill.proficiency_level ? 'active' : ''}"></span>`).join('')}
              </div>
            </div>
            <button class="btn btn-ghost btn-sm delete-skill" data-id="${skill.id}" style="color:var(--error);">🗑️</button>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">⚡</div>
        <h3>Henüz Beceri Eklenmemiş</h3>
        <p>Becerilerinizi ekleyerek eşleştirme sistemini kullanmaya başlayın</p>
      </div>
    `}
  `;

  // Show/hide add form
  const addBtn = document.getElementById('addSkillBtn');
  const form = document.getElementById('addSkillForm');
  addBtn.addEventListener('click', () => form.classList.toggle('hidden'));
  document.getElementById('cancelSkillBtn').addEventListener('click', () => form.classList.add('hidden'));

  // Save skill
  document.getElementById('saveSkillBtn').addEventListener('click', async () => {
    const skillName = document.getElementById('skillNameInput').value.trim();
    const level = parseInt(document.getElementById('skillLevelInput').value);
    if (!skillName) { window.showToast('Beceri adı zorunludur', 'error'); return; }
    try {
      await studentsAPI.addSkill({ skillName, proficiencyLevel: level });
      window.showToast('Beceri eklendi!', 'success');
      renderSkills(content);
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });

  // Delete skills
  content.querySelectorAll('.delete-skill').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await studentsAPI.removeSkill(btn.dataset.id);
        window.showToast('Beceri silindi', 'success');
        renderSkills(content);
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  });
}

function getProfileCompletion(profile) {
  if (!profile) return 0;
  const fields = ['university', 'department', 'graduation_year', 'bio', 'city', 'phone'];
  const filled = fields.filter(f => profile[f]).length;
  const hasSkills = (profile.skills && profile.skills.length > 0) ? 1 : 0;
  const hasCv = profile.cv_url ? 1 : 0;
  return Math.round(((filled + hasSkills + hasCv) / (fields.length + 2)) * 100);
}

async function renderNotifications(content) {
  let notifications = [];
  try {
    const data = await notificationsAPI.list();
    notifications = data.notifications || [];
  } catch (e) { /* */ }

  const notifIcons = {
    'new_application': '📩',
    'application_status': '📋',
    'new_job': '💼',
    'new_match': '🎯',
  };

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>🔔 Bildirimler</h1>
      <button class="btn btn-secondary btn-sm" id="markAllReadDashBtn">✓ Tümünü Okundu Yap</button>
    </div>
    ${notifications.length > 0 ? `
      <div class="card">
        ${notifications.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--border-color);cursor:pointer;" data-id="${n.id}" data-link="${n.link || ''}">
            <div class="notif-item-icon">${notifIcons[n.type] || '🔔'}</div>
            <div class="notif-item-content">
              <div class="notif-item-title">${n.title}</div>
              <div class="notif-item-message">${n.message || ''}</div>
              <div class="notif-item-time">${n.created_at ? new Date(n.created_at).toLocaleString('tr-TR') : ''}</div>
            </div>
            ${!n.is_read ? '<div class="notif-item-dot"></div>' : ''}
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <h3>Henüz Bildirim Yok</h3>
        <p>Yeni eşleşmeler ve başvuru güncellemeleri burada görünecek</p>
      </div>
    `}
  `;

  // Mark all read
  document.getElementById('markAllReadDashBtn')?.addEventListener('click', async () => {
    try {
      await notificationsAPI.markAllRead();
      content.querySelectorAll('.notif-item').forEach(item => {
        item.classList.remove('unread');
        item.querySelector('.notif-item-dot')?.remove();
      });
      window.showToast('Tüm bildirimler okundu', 'success');
    } catch (e) { window.showToast('Hata oluştu', 'error'); }
  });

  // Click on notification
  content.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      const link = item.dataset.link;
      try { await notificationsAPI.markRead(id); } catch (e) { /* */ }
      item.classList.remove('unread');
      item.querySelector('.notif-item-dot')?.remove();
      if (link) window.location.hash = link;
    });
  });
}
