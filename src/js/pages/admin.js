// ── Admin Dashboard ──
import { getUser, adminAPI } from '../api.js';

export async function renderAdmin(container) {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    window.location.hash = '#/';
    window.showToast('Bu sayfaya erişim yetkiniz yok', 'error');
    return;
  }

  container.innerHTML = `
    <div class="container">
      <div class="dashboard">
        <aside class="dashboard-sidebar">
          <div class="card" style="margin-bottom:var(--space-4);">
            <div style="text-align:center;">
              <div class="profile-avatar" style="width:64px;height:64px;font-size:var(--font-2xl);margin:0 auto var(--space-3);background:linear-gradient(135deg,#ef4444,#f97316);">🛡️</div>
              <h3 style="font-size:var(--font-base);font-weight:700;">Admin Panel</h3>
              <p class="text-sm text-muted">${user.fullName}</p>
            </div>
          </div>
          <div class="card">
            <ul class="sidebar-nav">
              <li><a href="javascript:void(0)" class="active" data-tab="overview">📊 Genel Bakış</a></li>
              <li><a href="javascript:void(0)" data-tab="users">👥 Kullanıcılar</a></li>
              <li><a href="javascript:void(0)" data-tab="jobs">📋 İlanlar</a></li>
              <li><a href="javascript:void(0)" data-tab="create-job">➕ İlan Ekle</a></li>
              <li><a href="javascript:void(0)" data-tab="applications">📬 Başvurular</a></li>
              <li><a href="javascript:void(0)" data-tab="settings">⚙️ Site Ayarları</a></li>
            </ul>
          </div>
        </aside>
        <div class="dashboard-main" id="adminContent">
          <div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      e.target.classList.add('active');
      loadAdminTab(e.target.dataset.tab);
    });
  });

  loadAdminTab('overview');
}

function switchTab(tab) {
  document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
  document.querySelector(`.sidebar-nav a[data-tab="${tab}"]`)?.classList.add('active');
  loadAdminTab(tab);
}

async function loadAdminTab(tab) {
  const c = document.getElementById('adminContent');
  c.innerHTML = '<div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>';
  switch (tab) {
    case 'overview': await renderAdminOverview(c); break;
    case 'users': await renderAdminUsers(c); break;
    case 'jobs': await renderAdminJobs(c); break;
    case 'create-job': renderCreateJob(c); break;
    case 'applications': await renderAdminApplications(c); break;
    case 'settings': await renderAdminSettings(c); break;
  }
}

// ── Overview ──
async function renderAdminOverview(c) {
  let stats = {};
  try { stats = await adminAPI.stats(); } catch (e) { console.error(e); }

  c.innerHTML = `
    <div class="dashboard-header"><h1>🛡️ Admin Paneli</h1></div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-card-value">${stats.totalUsers || 0}</div><div class="stat-card-label">Toplam Kullanıcı</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.totalStudents || 0}</div><div class="stat-card-label">Öğrenci</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.totalEmployers || 0}</div><div class="stat-card-label">İşveren</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.totalJobs || 0}</div><div class="stat-card-label">Toplam İlan</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.activeJobs || 0}</div><div class="stat-card-label">Aktif İlan</div></div>
      <div class="stat-card"><div class="stat-card-value">${stats.totalApplications || 0}</div><div class="stat-card-label">Toplam Başvuru</div></div>
    </div>
    <div class="card" style="margin-top:var(--space-6);">
      <h3 style="margin-bottom:var(--space-4);">🚀 Hızlı İşlemler</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
        <button class="btn btn-primary btn-sm" data-quick="create-job">➕ İlan Ekle</button>
        <button class="btn btn-secondary btn-sm" data-quick="users">👥 Kullanıcıları Yönet</button>
        <button class="btn btn-accent btn-sm" data-quick="jobs">📋 İlanları Yönet</button>
        <button class="btn btn-ghost btn-sm" data-quick="settings">⚙️ Site Ayarları</button>
      </div>
    </div>
  `;

  c.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.quick));
  });
}

// ── Users ──
async function renderAdminUsers(c) {
  let users = [];
  try { const data = await adminAPI.users(); users = data.users || []; } catch (e) { console.error(e); }

  const roleBadge = (role) => {
    const map = { student: ['badge-primary', '🎓 Öğrenci'], employer: ['badge-accent', '🏢 İşveren'], admin: ['badge-error', '🛡️ Admin'] };
    const [cls, label] = map[role] || ['badge-primary', role];
    return `<span class="badge ${cls}">${label}</span>`;
  };

  c.innerHTML = `
    <div class="dashboard-header"><h1>👥 Kullanıcı Yönetimi</h1><span class="badge badge-primary">${users.length} kullanıcı</span></div>
    ${users.length > 0 ? `
    <div class="table-wrapper">
      <table class="table">
        <thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Detay</th><th>Kayıt</th><th>İşlem</th></tr></thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td style="font-weight:600;">${u.full_name}</td>
              <td class="text-muted">${u.email}</td>
              <td>${roleBadge(u.role)}</td>
              <td class="text-sm text-muted">${u.role === 'student' ? (u.university || '-') : (u.company_name || '-')}</td>
              <td class="text-sm text-muted">${new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
              <td>
                <div style="display:flex;gap:var(--space-1);">
                  ${u.role !== 'admin' ? `
                    <select class="form-select change-role" data-uid="${u.id}" style="width:auto;padding:4px 8px;font-size:0.7rem;">
                      <option value="student" ${u.role === 'student' ? 'selected' : ''}>Öğrenci</option>
                      <option value="employer" ${u.role === 'employer' ? 'selected' : ''}>İşveren</option>
                    </select>
                    <button class="btn btn-ghost btn-sm delete-user" data-uid="${u.id}" style="color:var(--error);padding:4px 8px;">🗑️</button>
                  ` : '<span class="text-xs text-muted">—</span>'}
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : '<div class="empty-state"><p>Henüz kullanıcı yok</p></div>'}
  `;

  c.querySelectorAll('.change-role').forEach(sel => {
    sel.addEventListener('change', async () => {
      try { await adminAPI.updateUserRole(sel.dataset.uid, sel.value); window.showToast('Rol güncellendi', 'success'); } catch (e) { window.showToast(e.message, 'error'); }
    });
  });
  c.querySelectorAll('.delete-user').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
      try { await adminAPI.deleteUser(btn.dataset.uid); window.showToast('Kullanıcı silindi', 'success'); renderAdminUsers(c); } catch (e) { window.showToast(e.message, 'error'); }
    });
  });
}

// ── Jobs ──
async function renderAdminJobs(c) {
  let jobs = [];
  try { const data = await adminAPI.jobs(); jobs = data.jobs || []; } catch (e) { console.error(e); }

  c.innerHTML = `
    <div class="dashboard-header">
      <h1>📋 İlan Yönetimi</h1>
      <div style="display:flex;gap:var(--space-2);align-items:center;">
        <span class="badge badge-primary">${jobs.length} ilan</span>
        <button class="btn btn-primary btn-sm" id="addJobBtnAdmin">➕ Yeni İlan</button>
      </div>
    </div>
    ${jobs.length > 0 ? `
    <div class="table-wrapper">
      <table class="table">
        <thead><tr><th>İlan</th><th>Şirket</th><th>Tür</th><th>Başvuru</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
        <tbody>
          ${jobs.map(j => `
            <tr>
              <td style="font-weight:600;">${j.title}</td>
              <td>${j.company_name || '<span class="text-muted text-xs">Admin ekledi</span>'}</td>
              <td><span class="badge ${j.type === 'internship' ? 'badge-accent' : 'badge-primary'}">${j.type === 'internship' ? 'Staj' : 'İş'}</span></td>
              <td><span class="badge badge-primary">${j.application_count || 0}</span></td>
              <td><span class="badge ${j.is_active ? 'badge-success' : 'badge-error'}">${j.is_active ? 'Aktif' : 'Pasif'}</span></td>
              <td class="text-sm text-muted">${new Date(j.created_at).toLocaleDateString('tr-TR')}</td>
              <td>
                <div style="display:flex;gap:var(--space-1);">
                  <button class="btn btn-ghost btn-sm toggle-job" data-jid="${j.id}" style="padding:4px 8px;">${j.is_active ? '⏸️' : '▶️'}</button>
                  <button class="btn btn-ghost btn-sm delete-job" data-jid="${j.id}" style="color:var(--error);padding:4px 8px;">🗑️</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : '<div class="empty-state"><p>Henüz ilan yok</p></div>'}
  `;

  document.getElementById('addJobBtnAdmin')?.addEventListener('click', () => switchTab('create-job'));

  c.querySelectorAll('.toggle-job').forEach(btn => {
    btn.addEventListener('click', async () => {
      try { await adminAPI.toggleJob(btn.dataset.jid); window.showToast('İlan durumu güncellendi', 'success'); renderAdminJobs(c); } catch (e) { window.showToast(e.message, 'error'); }
    });
  });
  c.querySelectorAll('.delete-job').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
      try { await adminAPI.deleteJob(btn.dataset.jid); window.showToast('İlan silindi', 'success'); renderAdminJobs(c); } catch (e) { window.showToast(e.message, 'error'); }
    });
  });
}

// ── Create Job ──
function renderCreateJob(c) {
  let requirements = [];

  c.innerHTML = `
    <div class="dashboard-header"><h1>➕ İlan Ekle</h1></div>
    <div class="card" style="border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.05);margin-bottom:var(--space-4);padding:var(--space-3);">
      <p style="font-size:var(--font-sm);">💡 İnternetten bulduğunuz ilanları buradan ekleyebilirsiniz. İşveren hesabı gerekmez.</p>
    </div>

    <div class="card">
      <form id="adminCreateJobForm">
        <h3 style="margin-bottom:var(--space-4);">🏢 Şirket Bilgileri</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Şirket Adı *</label>
            <input type="text" class="form-input" id="ajCompanyName" placeholder="Örn: Google Türkiye" required>
          </div>
          <div class="form-group">
            <label class="form-label">Şirket Web Sitesi</label>
            <input type="url" class="form-input" id="ajCompanyWeb" placeholder="https://...">
          </div>
        </div>

        <hr style="border-color:var(--border-color);margin:var(--space-6) 0;">

        <h3 style="margin-bottom:var(--space-4);">📋 İlan Bilgileri</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">İlan Başlığı *</label>
            <input type="text" class="form-input" id="ajTitle" placeholder="Örn: Frontend Developer Stajyeri" required>
          </div>
          <div class="form-group">
            <label class="form-label">İlan Türü *</label>
            <select class="form-select" id="ajType">
              <option value="internship">🎓 Staj İlanı</option>
              <option value="job">💼 İş İlanı</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Açıklama *</label>
          <textarea class="form-textarea" id="ajDescription" placeholder="İlan detaylarını, sorumlulukları, aranan nitelikleri yazın..." required style="min-height:180px;"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">📍 Konum</label>
            <input type="text" class="form-input" id="ajLocation" placeholder="Örn: İstanbul, Ankara">
          </div>
          <div class="form-group">
            <label class="form-label">🏠 Uzaktan Çalışma</label>
            <select class="form-select" id="ajRemote">
              <option value="false">Hayır</option>
              <option value="true">Evet</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">💰 Min Maaş (₺)</label>
            <input type="number" class="form-input" id="ajSalaryMin" placeholder="Opsiyonel">
          </div>
          <div class="form-group">
            <label class="form-label">💰 Max Maaş (₺)</label>
            <input type="number" class="form-input" id="ajSalaryMax" placeholder="Opsiyonel">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">📅 Son Başvuru Tarihi</label>
          <input type="date" class="form-input" id="ajDeadline">
        </div>

        <hr style="border-color:var(--border-color);margin:var(--space-6) 0;">

        <h3 style="margin-bottom:var(--space-4);">🎯 Aranan Beceriler</h3>
        <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);flex-wrap:wrap;">
          <input type="text" class="form-input" id="ajReqSkill" placeholder="Beceri adı" style="flex:1;min-width:150px;">
          <select class="form-select" id="ajReqLevel" style="width:auto;">
            <option value="1">Seviye 1</option>
            <option value="2">Seviye 2</option>
            <option value="3" selected>Seviye 3</option>
            <option value="4">Seviye 4</option>
            <option value="5">Seviye 5</option>
          </select>
          <label style="display:flex;align-items:center;gap:4px;font-size:var(--font-sm);white-space:nowrap;">
            <input type="checkbox" id="ajReqRequired" checked> Zorunlu
          </label>
          <button type="button" class="btn btn-secondary btn-sm" id="ajAddReqBtn">Ekle</button>
        </div>
        <div id="ajReqList" style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-4);"></div>

        <button type="submit" class="btn btn-primary btn-lg w-full" id="ajSubmitBtn">📤 İlanı Yayınla</button>
      </form>
    </div>
  `;

  // Requirements
  document.getElementById('ajAddReqBtn').addEventListener('click', () => {
    const name = document.getElementById('ajReqSkill').value.trim();
    if (!name) return;
    requirements.push({
      skillName: name,
      minProficiency: parseInt(document.getElementById('ajReqLevel').value),
      isRequired: document.getElementById('ajReqRequired').checked
    });
    renderReqs();
    document.getElementById('ajReqSkill').value = '';
  });

  function renderReqs() {
    const list = document.getElementById('ajReqList');
    list.innerHTML = requirements.map((r, i) => `
      <span class="skill-tag">${r.skillName} (Lv.${r.minProficiency}) ${r.isRequired ? '' : '(tercih)'} <button type="button" class="remove-req" data-idx="${i}">✕</button></span>
    `).join('');
    list.querySelectorAll('.remove-req').forEach(b => {
      b.addEventListener('click', () => { requirements.splice(parseInt(b.dataset.idx), 1); renderReqs(); });
    });
  }

  // Submit
  document.getElementById('adminCreateJobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ajSubmitBtn');
    btn.disabled = true; btn.textContent = 'Oluşturuluyor...';

    try {
      await adminAPI.createJob({
        title: document.getElementById('ajTitle').value,
        description: document.getElementById('ajDescription').value,
        type: document.getElementById('ajType').value,
        location: document.getElementById('ajLocation').value,
        isRemote: document.getElementById('ajRemote').value === 'true',
        salaryMin: parseInt(document.getElementById('ajSalaryMin').value) || null,
        salaryMax: parseInt(document.getElementById('ajSalaryMax').value) || null,
        deadline: document.getElementById('ajDeadline').value || null,
        companyName: document.getElementById('ajCompanyName').value,
        companyWebsite: document.getElementById('ajCompanyWeb').value,
        requirements
      });
      window.showToast('İlan başarıyla eklendi! 🎉', 'success');
      requirements = [];
      switchTab('jobs');
    } catch (error) {
      window.showToast(error.message, 'error');
      btn.disabled = false; btn.textContent = '📤 İlanı Yayınla';
    }
  });
}

// ── Applications ──
async function renderAdminApplications(c) {
  let apps = [];
  try { const data = await adminAPI.applications(); apps = data.applications || []; } catch (e) { console.error(e); }

  const statusMap = { pending: ['badge-warning', 'Beklemede'], reviewed: ['badge-primary', 'İncelendi'], accepted: ['badge-success', 'Kabul'], rejected: ['badge-error', 'Red'] };

  c.innerHTML = `
    <div class="dashboard-header"><h1>📬 Başvuru Yönetimi</h1><span class="badge badge-primary">${apps.length} başvuru</span></div>
    ${apps.length > 0 ? `
    <div class="table-wrapper">
      <table class="table">
        <thead><tr><th>Öğrenci</th><th>E-posta</th><th>İlan</th><th>Şirket</th><th>Skor</th><th>Durum</th><th>Tarih</th></tr></thead>
        <tbody>
          ${apps.map(a => {
    const [cls, label] = statusMap[a.status] || ['badge-primary', a.status];
    return `
            <tr>
              <td style="font-weight:600;">${a.student_name}</td>
              <td class="text-sm text-muted">${a.student_email}</td>
              <td>${a.job_title}</td>
              <td>${a.company_name || '-'}</td>
              <td><span class="badge ${a.match_score >= 70 ? 'badge-success' : a.match_score >= 40 ? 'badge-warning' : 'badge-error'}">%${a.match_score || 0}</span></td>
              <td><span class="badge ${cls}">${label}</span></td>
              <td class="text-sm text-muted">${new Date(a.applied_at).toLocaleDateString('tr-TR')}</td>
            </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>
    ` : '<div class="empty-state"><p>Henüz başvuru yok</p></div>'}
  `;
}

// ── Settings ──
async function renderAdminSettings(c) {
  let settings = {};
  try { const data = await adminAPI.getSettings(); settings = data.settings || {}; } catch (e) { console.error(e); }

  c.innerHTML = `
    <div class="dashboard-header"><h1>⚙️ Site Ayarları</h1></div>
    <div class="card">
      <form id="settingsForm">
        <div class="form-group">
          <label class="form-label">🏷️ Site Başlığı</label>
          <input type="text" class="form-input" id="setSiteTitle" value="${settings.site_title || 'KariyerMatch'}">
        </div>
        <div class="form-group">
          <label class="form-label">🎯 Hero Başlık</label>
          <input type="text" class="form-input" id="setHeroTitle" value="${settings.hero_title || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">📝 Hero Alt Başlık</label>
          <textarea class="form-textarea" id="setHeroSubtitle">${settings.hero_subtitle || ''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">🔘 Hero Buton Metni</label>
          <input type="text" class="form-input" id="setHeroCta" value="${settings.hero_cta || 'Hemen Başla'}">
        </div>
        <div class="form-group">
          <label class="form-label">📢 Duyuru Mesajı <span class="text-xs text-muted">(boş bırakırsanız gösterilmez)</span></label>
          <textarea class="form-textarea" id="setAnnouncement" placeholder="Örn: Yeni özellikler eklendi!">${settings.announcement || ''}</textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-full" id="saveSettingsBtn">💾 Ayarları Kaydet</button>
      </form>
    </div>
  `;

  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true; btn.textContent = 'Kaydediliyor...';
    try {
      await adminAPI.updateSettings({
        site_title: document.getElementById('setSiteTitle').value,
        hero_title: document.getElementById('setHeroTitle').value,
        hero_subtitle: document.getElementById('setHeroSubtitle').value,
        hero_cta: document.getElementById('setHeroCta').value,
        announcement: document.getElementById('setAnnouncement').value
      });
      window.showToast('Ayarlar kaydedildi! ✅', 'success');
    } catch (e) { window.showToast(e.message, 'error'); }
    btn.disabled = false; btn.textContent = '💾 Ayarları Kaydet';
  });
}
