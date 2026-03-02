// ── Student Dashboard ──
import { studentsAPI, matchAPI, applicationsAPI, notificationsAPI, getUser, uploadFile } from '../api.js';
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
              <li><a href="javascript:void(0)" data-tab="languages">🌍 Dil Becerileri</a></li>
              <li><a href="javascript:void(0)" data-tab="references">📎 Referanslarım</a></li>
              <li><a href="javascript:void(0)" data-tab="notifications">🔔 Bildirimler</a></li>
              <li><a href="#/messages">💬 Mesajlar</a></li>
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
    case 'languages': await renderLanguages(content); break;
    case 'references': await renderReferences(content); break;
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
  const langCount = profile?.languages?.length || 0;
  const refCount = profile?.references?.length || 0;
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
        <div class="stat-card-value">${langCount}</div>
        <div class="stat-card-label">Dil</div>
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
        <div class="stat-card-value">${refCount}</div>
        <div class="stat-card-label">Referans</div>
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
          Daha iyi eşleşmeler için becerilerinizi, dil skorlarınızı ve referanslarınızı ekleyin. Profili tam dolu olanlar şirketlere daha çok görünür!
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

// ── SKILLS TAB (Sertifika/Referans doğrulamalı) ──
async function renderSkills(content) {
  let profile = null;
  try {
    const data = await studentsAPI.getProfile();
    profile = data.profile;
  } catch (e) { /* demo */ }

  const skills = profile?.skills || [];
  const references = profile?.references || [];

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
          <label class="form-label">Beceri Adı *</label>
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

      <div class="form-group">
        <label class="form-label">Doğrulama Yöntemi *</label>
        <select class="form-select" id="skillVerifyType">
          <option value="none">Doğrulama Yok (daha düşük görünürlük)</option>
          <option value="certificate">📜 Sertifika (PDF yükle)</option>
          <option value="reference">📎 Referans Mektubu (mevcut referanslardan seç)</option>
        </select>
        <p class="form-hint">Sertifika veya referans eklerseniz şirketlere daha fazla görünürsünüz</p>
      </div>

      <!-- Sertifika upload alanı -->
      <div class="form-group hidden" id="skillCertArea">
        <label class="form-label">📜 Sertifika (PDF) *</label>
        <input type="file" class="form-input" id="skillCertFile" accept=".pdf">
        <p class="form-hint">Sadece PDF, max 5MB. Katılım belgesi değil, sertifika yükleyin.</p>
      </div>

      <!-- Referans seçim alanı -->
      <div class="form-group hidden" id="skillRefArea">
        <label class="form-label">📎 Referans Seç *</label>
        <select class="form-select" id="skillRefSelect">
          <option value="">Referans seçin...</option>
          ${references.map(r => `<option value="${r.id}">${r.reference_name} — ${r.institution || 'Belirtilmemiş'}</option>`).join('')}
        </select>
        <p class="form-hint">Önce "Referanslarım" sekmesinden referans mektubu ekleyin</p>
      </div>

      <div style="display:flex;gap:var(--space-3);">
        <button class="btn btn-primary btn-sm" id="saveSkillBtn">Kaydet</button>
        <button class="btn btn-ghost btn-sm" id="cancelSkillBtn">İptal</button>
      </div>
    </div>

    ${skills.length > 0 ? `
      <div class="card">
        ${skills.map(skill => `
          <div class="enhanced-skill-item" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) 0;border-bottom:1px solid var(--border-color);">
            <div style="display:flex;align-items:center;gap:var(--space-3);flex:1;">
              <span style="font-weight:600;">${skill.skill_name}</span>
              <div class="skill-level">
                ${Array.from({ length: 5 }, (_, i) => `<span class="skill-level-dot ${i < skill.proficiency_level ? 'active' : ''}"></span>`).join('')}
              </div>
              ${skill.verification_type === 'certificate' ? '<span class="badge badge-success" style="font-size:0.65rem;">📜 Sertifikalı</span>' : ''}
              ${skill.verification_type === 'reference' ? `<span class="badge badge-accent" style="font-size:0.65rem;">📎 ${skill.reference_name || 'Referanslı'}</span>` : ''}
              ${!skill.verification_type || skill.verification_type === 'none' ? '<span class="badge badge-warning" style="font-size:0.65rem;">⚠️ Doğrulanmamış</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              ${skill.certificate_url ? `<a href="${skill.certificate_url}" target="_blank" class="btn btn-ghost btn-sm" title="Sertifikayı Görüntüle">📄</a>` : ''}
              <button class="btn btn-ghost btn-sm delete-skill" data-id="${skill.id}" style="color:var(--error);">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">⚡</div>
        <h3>Henüz Beceri Eklenmemiş</h3>
        <p>Becerilerinizi sertifika veya referansla doğrulayarak ekleyin</p>
      </div>
    `}
  `;

  // Show/hide add form
  const addBtn = document.getElementById('addSkillBtn');
  const form = document.getElementById('addSkillForm');
  addBtn.addEventListener('click', () => form.classList.toggle('hidden'));
  document.getElementById('cancelSkillBtn').addEventListener('click', () => form.classList.add('hidden'));

  // Toggle cert/ref areas based on verification type
  const verifySelect = document.getElementById('skillVerifyType');
  verifySelect.addEventListener('change', () => {
    document.getElementById('skillCertArea').classList.toggle('hidden', verifySelect.value !== 'certificate');
    document.getElementById('skillRefArea').classList.toggle('hidden', verifySelect.value !== 'reference');
  });

  // Save skill
  document.getElementById('saveSkillBtn').addEventListener('click', async () => {
    const skillName = document.getElementById('skillNameInput').value.trim();
    const level = parseInt(document.getElementById('skillLevelInput').value);
    const vType = verifySelect.value;

    if (!skillName) { window.showToast('Beceri adı zorunludur', 'error'); return; }

    let certUrl = null;
    let refId = null;

    if (vType === 'certificate') {
      const fileInput = document.getElementById('skillCertFile');
      if (!fileInput.files[0]) { window.showToast('Sertifika PDF dosyası seçin', 'error'); return; }
      try {
        window.showToast('Sertifika yükleniyor...', 'info');
        const uploadResult = await uploadFile(fileInput.files[0]);
        certUrl = uploadResult.url;
      } catch (err) {
        window.showToast(err.message, 'error');
        return;
      }
    }

    if (vType === 'reference') {
      refId = document.getElementById('skillRefSelect').value;
      if (!refId) { window.showToast('Bir referans seçin', 'error'); return; }
      refId = parseInt(refId);
    }

    try {
      await studentsAPI.addSkill({
        skillName,
        proficiencyLevel: level,
        certificateUrl: certUrl,
        verificationType: vType,
        referenceId: refId
      });
      window.showToast('Beceri eklendi! ✅', 'success');
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

// ── LANGUAGES TAB ──
async function renderLanguages(content) {
  let profile = null;
  try {
    const data = await studentsAPI.getProfile();
    profile = data.profile;
  } catch (e) { /* demo */ }

  const languages = profile?.languages || [];

  const examInfo = {
    'TOEFL': { max: '120', icon: '🇺🇸' },
    'IELTS': { max: '9.0', icon: '🇬🇧' },
    'YDS': { max: '100', icon: '🇹🇷' },
    'YÖKDİL': { max: '100', icon: '🇹🇷' }
  };

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>🌍 Dil Becerileri</h1>
      <button class="btn btn-primary btn-sm" id="addLangBtn">+ Dil Skoru Ekle</button>
    </div>

    <div class="card hidden" id="addLangForm" style="margin-bottom:var(--space-6);">
      <h3 style="margin-bottom:var(--space-4);">Dil Sınavı Skoru Ekle</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">📝 Sınav Türü *</label>
          <select class="form-select" id="langExamType">
            <option value="TOEFL">🇺🇸 TOEFL (max 120)</option>
            <option value="IELTS">🇬🇧 IELTS (max 9.0)</option>
            <option value="YDS">🇹🇷 YDS (max 100)</option>
            <option value="YÖKDİL">🇹🇷 YÖKDİL (max 100)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">📊 Skor *</label>
          <input type="text" class="form-input" id="langScore" placeholder="Örn: 95">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">📄 Sonuç Belgesi (PDF) * <span style="color:var(--error);">Zorunlu</span></label>
        <input type="file" class="form-input" id="langCertFile" accept=".pdf">
        <p class="form-hint">Sonuç belgesi yüklenmeden skor kabul edilmez</p>
      </div>
      <div style="display:flex;gap:var(--space-3);">
        <button class="btn btn-primary btn-sm" id="saveLangBtn">Kaydet</button>
        <button class="btn btn-ghost btn-sm" id="cancelLangBtn">İptal</button>
      </div>
    </div>

    ${languages.length > 0 ? `
      <div class="lang-cards-grid">
        ${languages.map(lang => `
          <div class="card lang-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
              <div style="display:flex;align-items:center;gap:var(--space-2);">
                <span style="font-size:1.5rem;">${examInfo[lang.exam_type]?.icon || '🌐'}</span>
                <h3 style="font-size:var(--font-lg);margin:0;">${lang.exam_type}</h3>
              </div>
              <button class="btn btn-ghost btn-sm delete-lang" data-id="${lang.id}" style="color:var(--error);">🗑️</button>
            </div>
            <div style="font-size:var(--font-2xl);font-weight:800;background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:var(--space-2);">
              ${lang.score}
            </div>
            <div style="font-size:var(--font-xs);color:var(--text-muted);">Max: ${examInfo[lang.exam_type]?.max || '?'}</div>
            ${lang.certificate_url ? `<a href="${lang.certificate_url}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:var(--space-2);">📄 Belgeyi Görüntüle</a>` : ''}
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">🌍</div>
        <h3>Henüz Dil Skoru Eklenmemiş</h3>
        <p>TOEFL, IELTS, YDS veya YÖKDİL sonucunuzu belgenizle birlikte ekleyin</p>
      </div>
    `}
  `;

  // Show/hide form
  document.getElementById('addLangBtn').addEventListener('click', () => document.getElementById('addLangForm').classList.toggle('hidden'));
  document.getElementById('cancelLangBtn').addEventListener('click', () => document.getElementById('addLangForm').classList.add('hidden'));

  // Save language
  document.getElementById('saveLangBtn').addEventListener('click', async () => {
    const examType = document.getElementById('langExamType').value;
    const score = document.getElementById('langScore').value.trim();
    const fileInput = document.getElementById('langCertFile');

    if (!score) { window.showToast('Skor zorunludur', 'error'); return; }
    if (!fileInput.files[0]) { window.showToast('Sonuç belgesi (PDF) yüklenmesi zorunludur', 'error'); return; }

    try {
      window.showToast('Belge yükleniyor...', 'info');
      const uploadResult = await uploadFile(fileInput.files[0]);

      await studentsAPI.addLanguage({
        examType,
        score,
        certificateUrl: uploadResult.url
      });
      window.showToast('Dil skoru eklendi! ✅', 'success');
      renderLanguages(content);
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });

  // Delete language
  content.querySelectorAll('.delete-lang').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await studentsAPI.removeLanguage(btn.dataset.id);
        window.showToast('Dil skoru silindi', 'success');
        renderLanguages(content);
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  });
}

// ── REFERENCES TAB ──
async function renderReferences(content) {
  let profile = null;
  try {
    const data = await studentsAPI.getProfile();
    profile = data.profile;
  } catch (e) { /* demo */ }

  const references = profile?.references || [];

  const contextLabels = {
    'academic': '🎓 Akademik',
    'work': '💼 İş',
    'skill': '⚡ Beceri'
  };

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>📎 Referanslarım</h1>
      <button class="btn btn-primary btn-sm" id="addRefBtn">+ Referans Ekle</button>
    </div>

    <div class="card hidden" id="addRefForm" style="margin-bottom:var(--space-6);">
      <h3 style="margin-bottom:var(--space-4);">Yeni Referans Mektubu Ekle</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">👤 Referans Veren Kişi *</label>
          <input type="text" class="form-input" id="refName" placeholder="Örn: Prof. Dr. Ahmet Yılmaz">
        </div>
        <div class="form-group">
          <label class="form-label">🏷️ Unvan</label>
          <input type="text" class="form-input" id="refTitle" placeholder="Örn: Profesör, Müdür...">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">🏛️ Kurum</label>
          <input type="text" class="form-input" id="refInstitution" placeholder="Örn: İstanbul Üniversitesi">
        </div>
        <div class="form-group">
          <label class="form-label">📂 Bağlam</label>
          <select class="form-select" id="refContext">
            <option value="academic">🎓 Akademik (ders, tez vb.)</option>
            <option value="work">💼 İş Deneyimi</option>
            <option value="skill">⚡ Beceri Doğrulama</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">📄 Referans Mektubu (PDF) * <span style="color:var(--error);">Zorunlu</span></label>
        <input type="file" class="form-input" id="refLetterFile" accept=".pdf">
        <p class="form-hint">Hocanızdan/yöneticinizden aldığınız referans mektubunu PDF olarak yükleyin</p>
      </div>
      <div style="display:flex;gap:var(--space-3);">
        <button class="btn btn-primary btn-sm" id="saveRefBtn">Kaydet</button>
        <button class="btn btn-ghost btn-sm" id="cancelRefBtn">İptal</button>
      </div>
    </div>

    ${references.length > 0 ? `
      <div class="card">
        ${references.map(ref => `
          <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:var(--space-4) 0;border-bottom:1px solid var(--border-color);">
            <div>
              <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1);">
                <span style="font-weight:700;">${ref.reference_name}</span>
                <span class="badge badge-primary" style="font-size:0.65rem;">${contextLabels[ref.context] || '📎 Diğer'}</span>
              </div>
              ${ref.reference_title ? `<div class="text-sm text-muted">${ref.reference_title}</div>` : ''}
              ${ref.institution ? `<div class="text-sm text-muted">🏛️ ${ref.institution}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <a href="${ref.letter_url}" target="_blank" class="btn btn-ghost btn-sm">📄 Mektubu Gör</a>
              <button class="btn btn-ghost btn-sm delete-ref" data-id="${ref.id}" style="color:var(--error);">🗑️</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">📎</div>
        <h3>Henüz Referans Eklenmemiş</h3>
        <p>Hocalarınızdan veya iş yöneticilerinizden aldığınız referans mektuplarını PDF olarak yükleyin</p>
      </div>
    `}
  `;

  // Show/hide form
  document.getElementById('addRefBtn').addEventListener('click', () => document.getElementById('addRefForm').classList.toggle('hidden'));
  document.getElementById('cancelRefBtn').addEventListener('click', () => document.getElementById('addRefForm').classList.add('hidden'));

  // Save reference
  document.getElementById('saveRefBtn').addEventListener('click', async () => {
    const refName = document.getElementById('refName').value.trim();
    const refTitle = document.getElementById('refTitle').value.trim();
    const institution = document.getElementById('refInstitution').value.trim();
    const context = document.getElementById('refContext').value;
    const fileInput = document.getElementById('refLetterFile');

    if (!refName) { window.showToast('Referans veren kişi adı zorunludur', 'error'); return; }
    if (!fileInput.files[0]) { window.showToast('Referans mektubu (PDF) zorunludur', 'error'); return; }

    try {
      window.showToast('Mektup yükleniyor...', 'info');
      const uploadResult = await uploadFile(fileInput.files[0]);

      await studentsAPI.addReference({
        referenceName: refName,
        referenceTitle: refTitle || null,
        institution: institution || null,
        letterUrl: uploadResult.url,
        context
      });
      window.showToast('Referans eklendi! ✅', 'success');
      renderReferences(content);
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });

  // Delete reference
  content.querySelectorAll('.delete-ref').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await studentsAPI.removeReference(btn.dataset.id);
        window.showToast('Referans silindi', 'success');
        renderReferences(content);
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  });
}

function getProfileCompletion(profile) {
  if (!profile) return 0;
  let score = 0;
  const max = 100;

  // Temel bilgiler (30 puan)
  if (profile.university) score += 5;
  if (profile.department) score += 5;
  if (profile.graduation_year) score += 3;
  if (profile.gpa) score += 5;
  if (profile.bio) score += 4;
  if (profile.city) score += 3;
  if (profile.phone) score += 3;
  if (profile.cv_url) score += 2;

  // Beceriler (30 puan)
  const skills = profile.skills || [];
  score += Math.min(15, skills.length * 3);
  const certSkills = skills.filter(s => s.verification_type === 'certificate' || s.verification_type === 'reference');
  score += Math.min(15, certSkills.length * 5);

  // Dil becerileri (20 puan)
  const langs = profile.languages || [];
  score += Math.min(20, langs.length * 10);

  // Referanslar (20 puan)
  const refs = profile.references || [];
  score += Math.min(20, refs.length * 7);

  return Math.min(max, score);
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
