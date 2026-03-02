// ── Employer Dashboard ──
import { employersAPI, jobsAPI, matchAPI, applicationsAPI, notificationsAPI, searchAPI, getUser } from '../api.js';

export async function renderEmployerDashboard(container) {
  const user = getUser();

  container.innerHTML = `
    <div class="container">
      <div class="dashboard">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div class="card" style="margin-bottom:var(--space-4);">
            <div style="text-align:center;">
              <div class="profile-avatar" style="width:64px;height:64px;font-size:var(--font-2xl);margin:0 auto var(--space-3);background:var(--gradient-accent);">
                ${(user.fullName || 'İ')[0].toUpperCase()}
              </div>
              <h3 style="font-size:var(--font-base);font-weight:700;">${user.fullName}</h3>
              <p class="text-sm text-muted">İşveren</p>
              <a href="#/profile" class="btn btn-secondary btn-sm w-full" style="margin-top:var(--space-3);">Profili Düzenle</a>
            </div>
          </div>
          <div class="card">
            <ul class="sidebar-nav">
              <li><a href="javascript:void(0)" class="active" data-tab="overview">📊 Genel Bakış</a></li>
              <li><a href="javascript:void(0)" data-tab="jobs">📋 İlanlarım</a></li>
              <li><a href="javascript:void(0)" data-tab="create">➕ Yeni İlan</a></li>
              <li><a href="javascript:void(0)" data-tab="search">🔍 Aday Ara</a></li>
              <li><a href="javascript:void(0)" data-tab="notifications">🔔 Bildirimler</a></li>
              <li><a href="#/messages">💬 Mesajlar</a></li>
            </ul>
          </div>
        </aside>

        <!-- Main -->
        <div class="dashboard-main" id="empDashContent">
          <div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  // Tab nav
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      e.target.classList.add('active');
      loadEmpTab(e.target.dataset.tab);
    });
  });

  loadEmpTab('overview');
}

async function loadEmpTab(tab) {
  const content = document.getElementById('empDashContent');
  content.innerHTML = '<div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>';

  switch (tab) {
    case 'overview': await renderEmpOverview(content); break;
    case 'jobs': await renderEmpJobs(content); break;
    case 'create': renderCreateJob(content); break;
    case 'search': renderCandidateSearch(content); break;
    case 'notifications': await renderEmpNotifications(content); break;
  }
}

async function renderEmpOverview(content) {
  let jobs = [];
  try {
    const data = await jobsAPI.my();
    jobs = data.jobs || [];
  } catch (e) { /* demo */ }

  const activeJobs = jobs.filter(j => j.is_active).length;
  const totalApps = jobs.reduce((sum, j) => sum + (parseInt(j.application_count) || 0), 0);

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>📊 Genel Bakış</h1>
      <button class="btn btn-primary btn-sm" id="newJobOverviewBtn">+ Yeni İlan</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-value">${jobs.length}</div>
        <div class="stat-card-label">Toplam İlan</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${activeJobs}</div>
        <div class="stat-card-label">Aktif İlan</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-value">${totalApps}</div>
        <div class="stat-card-label">Toplam Başvuru</div>
      </div>
    </div>

    <!-- Recent Jobs -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">📋 Son İlanlar</h3>
      </div>
      ${jobs.length > 0 ? jobs.slice(0, 5).map(job => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--border-color);">
          <div>
            <div style="font-weight:600;font-size:var(--font-sm);">${job.title}</div>
            <div class="text-xs text-muted">${job.type === 'internship' ? '🎓 Staj' : '💼 İş'} • ${job.location || 'Belirtilmemiş'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-3);">
            <span class="badge ${job.is_active ? 'badge-success' : 'badge-error'}">${job.is_active ? 'Aktif' : 'Pasif'}</span>
            <span class="badge badge-primary">${job.application_count || 0} başvuru</span>
            <button class="btn btn-ghost btn-sm view-candidates" data-job-id="${job.id}">Adayları Gör</button>
          </div>
        </div>
      `).join('') : `
        <div class="empty-state" style="padding:var(--space-8);">
          <p class="text-muted">Henüz ilan oluşturmadınız</p>
        </div>
      `}
    </div>
  `;

  // New job button
  document.getElementById('newJobOverviewBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
    document.querySelector('.sidebar-nav a[data-tab="create"]').classList.add('active');
    loadEmpTab('create');
  });

  // View candidates
  content.querySelectorAll('.view-candidates').forEach(btn => {
    btn.addEventListener('click', () => showCandidates(btn.dataset.jobId));
  });
}

async function renderEmpJobs(content) {
  let jobs = [];
  try {
    const data = await jobsAPI.my();
    jobs = data.jobs || [];
  } catch (e) { /* demo */ }

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>📋 İlanlarım</h1>
      <button class="btn btn-primary btn-sm" id="newJobListBtn">+ Yeni İlan</button>
    </div>

    ${jobs.length > 0 ? `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>İlan</th>
              <th>Tür</th>
              <th>Konum</th>
              <th>Başvuru</th>
              <th>Durum</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            ${jobs.map(job => `
              <tr>
                <td style="font-weight:600;">${job.title}</td>
                <td><span class="badge ${job.type === 'internship' ? 'badge-accent' : 'badge-primary'}">${job.type === 'internship' ? 'Staj' : 'İş'}</span></td>
                <td>${job.location || '-'}</td>
                <td><span class="badge badge-primary">${job.application_count || 0}</span></td>
                <td><span class="badge ${job.is_active ? 'badge-success' : 'badge-error'}">${job.is_active ? 'Aktif' : 'Pasif'}</span></td>
                <td>
                  <div style="display:flex;gap:var(--space-2);">
                    <button class="btn btn-ghost btn-sm view-candidates" data-job-id="${job.id}">👥 Adaylar</button>
                    <button class="btn btn-ghost btn-sm toggle-job" data-job-id="${job.id}" data-active="${job.is_active}">${job.is_active ? '⏸️' : '▶️'}</button>
                    <button class="btn btn-ghost btn-sm delete-job" data-job-id="${job.id}" style="color:var(--error);">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>Henüz İlan Yok</h3>
        <p>İlk ilanınızı oluşturun ve adaylarla eşleşmeye başlayın</p>
      </div>
    `}
  `;

  // Event listeners
  document.getElementById('newJobListBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
    document.querySelector('.sidebar-nav a[data-tab="create"]').classList.add('active');
    loadEmpTab('create');
  });

  content.querySelectorAll('.view-candidates').forEach(btn => {
    btn.addEventListener('click', () => showCandidates(btn.dataset.jobId));
  });

  content.querySelectorAll('.toggle-job').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isActive = btn.dataset.active === 'true';
      try {
        await jobsAPI.update(btn.dataset.jobId, { isActive: !isActive });
        window.showToast(isActive ? 'İlan pasife alındı' : 'İlan aktifleştirildi', 'success');
        renderEmpJobs(content);
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  });

  content.querySelectorAll('.delete-job').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Bu ilanı silmek istediğinize emin misiniz?')) {
        try {
          await jobsAPI.delete(btn.dataset.jobId);
          window.showToast('İlan silindi', 'success');
          renderEmpJobs(content);
        } catch (error) {
          window.showToast(error.message, 'error');
        }
      }
    });
  });
}

function renderCreateJob(content) {
  let requirements = [];

  content.innerHTML = `
    <div class="dashboard-header">
      <h1>➕ Yeni İlan Oluştur</h1>
    </div>

    <div class="card">
      <form id="createJobForm">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">📝 İlan Başlığı *</label>
            <input type="text" class="form-input" id="jobTitle" placeholder="Örn: Frontend Developer" required>
          </div>
          <div class="form-group">
            <label class="form-label">📂 İlan Türü *</label>
            <select class="form-select" id="jobType">
              <option value="job">💼 İş İlanı</option>
              <option value="internship">🎓 Staj İlanı</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">📋 Açıklama *</label>
          <textarea class="form-textarea" id="jobDescription" placeholder="İlan detaylarını yazın..." required style="min-height:160px;"></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">📍 Konum</label>
            <input type="text" class="form-input" id="jobLocation" placeholder="Örn: İstanbul">
          </div>
          <div class="form-group">
            <label class="form-label">🏠 Uzaktan Çalışma</label>
            <select class="form-select" id="jobRemote">
              <option value="false">Hayır</option>
              <option value="true">Evet</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">💰 Minimum Maaş (₺)</label>
            <input type="number" class="form-input" id="jobSalaryMin" placeholder="Örn: 15000">
          </div>
          <div class="form-group">
            <label class="form-label">💰 Maksimum Maaş (₺)</label>
            <input type="number" class="form-input" id="jobSalaryMax" placeholder="Örn: 25000">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">📅 Son Başvuru Tarihi</label>
          <input type="date" class="form-input" id="jobDeadline">
        </div>

        <!-- Requirements -->
        <div class="form-group">
          <label class="form-label">🎯 Aranan Beceriler</label>
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);">
            <input type="text" class="form-input" id="reqSkillName" placeholder="Beceri adı" style="flex:1;">
            <select class="form-select" id="reqLevel" style="width:auto;">
              <option value="1">Seviye 1</option>
              <option value="2">Seviye 2</option>
              <option value="3" selected>Seviye 3</option>
              <option value="4">Seviye 4</option>
              <option value="5">Seviye 5</option>
            </select>
            <label style="display:flex;align-items:center;gap:var(--space-1);font-size:var(--font-sm);white-space:nowrap;">
              <input type="checkbox" id="reqRequired" checked> Zorunlu
            </label>
            <button type="button" class="btn btn-secondary btn-sm" id="addReqBtn">Ekle</button>
          </div>
          <div id="reqList" style="display:flex;flex-wrap:wrap;gap:var(--space-2);"></div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-full" id="submitJobBtn">İlanı Yayınla 🚀</button>
      </form>
    </div>
  `;

  // Add requirement
  document.getElementById('addReqBtn').addEventListener('click', () => {
    const name = document.getElementById('reqSkillName').value.trim();
    if (!name) return;
    const level = parseInt(document.getElementById('reqLevel').value);
    const isRequired = document.getElementById('reqRequired').checked;

    requirements.push({ skillName: name, minProficiency: level, isRequired });
    renderRequirements();
    document.getElementById('reqSkillName').value = '';
  });

  function renderRequirements() {
    const list = document.getElementById('reqList');
    list.innerHTML = requirements.map((req, i) => `
      <span class="skill-tag">
        ${req.skillName} (Lv.${req.minProficiency}) ${req.isRequired ? '' : '(tercih)'}
        <button class="remove-btn" data-idx="${i}">✕</button>
      </span>
    `).join('');

    list.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        requirements.splice(parseInt(btn.dataset.idx), 1);
        renderRequirements();
      });
    });
  }

  // Submit
  document.getElementById('createJobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitJobBtn');
    btn.disabled = true;
    btn.textContent = 'Oluşturuluyor...';

    try {
      await jobsAPI.create({
        title: document.getElementById('jobTitle').value,
        description: document.getElementById('jobDescription').value,
        type: document.getElementById('jobType').value,
        location: document.getElementById('jobLocation').value,
        isRemote: document.getElementById('jobRemote').value === 'true',
        salaryMin: parseInt(document.getElementById('jobSalaryMin').value) || null,
        salaryMax: parseInt(document.getElementById('jobSalaryMax').value) || null,
        deadline: document.getElementById('jobDeadline').value || null,
        requirements
      });

      window.showToast('İlan başarıyla oluşturuldu! 🎉', 'success');
      document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
      document.querySelector('.sidebar-nav a[data-tab="jobs"]').classList.add('active');
      loadEmpTab('jobs');
    } catch (error) {
      window.showToast(error.message, 'error');
      btn.disabled = false;
      btn.textContent = 'İlanı Yayınla 🚀';
    }
  });
}

// ── CANDIDATE SEARCH TAB ──
function renderCandidateSearch(content) {
  content.innerHTML = `
    <div class="dashboard-header">
      <h1>🔍 Aday Ara</h1>
    </div>

    <div class="card" style="margin-bottom:var(--space-6);">
      <h3 style="margin-bottom:var(--space-4);">Filtreler</h3>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">⚡ Beceriler</label>
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2);">
            <input type="text" class="form-input" id="filterSkillInput" placeholder="Beceri adı ekle...">
            <button class="btn btn-secondary btn-sm" id="addFilterSkillBtn">+</button>
          </div>
          <div id="filterSkillTags" style="display:flex;flex-wrap:wrap;gap:var(--space-1);"></div>
        </div>
        <div class="form-group">
          <label class="form-label">🌍 Dil Filtresi</label>
          <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2);">
            <select class="form-select" id="filterLangExam" style="flex:1;">
              <option value="">Sınav seç...</option>
              <option value="TOEFL">TOEFL</option>
              <option value="IELTS">IELTS</option>
              <option value="YDS">YDS</option>
              <option value="YÖKDİL">YÖKDİL</option>
            </select>
            <input type="number" class="form-input" id="filterLangMinScore" placeholder="Min skor" style="width:100px;">
            <button class="btn btn-secondary btn-sm" id="addFilterLangBtn">+</button>
          </div>
          <div id="filterLangTags" style="display:flex;flex-wrap:wrap;gap:var(--space-1);"></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">📍 Şehir</label>
          <input type="text" class="form-input" id="filterCity" placeholder="Örn: İstanbul">
        </div>
        <div class="form-group">
          <label class="form-label">🏫 Üniversite</label>
          <input type="text" class="form-input" id="filterUniversity" placeholder="Örn: Boğaziçi">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">📚 Bölüm</label>
          <input type="text" class="form-input" id="filterDepartment" placeholder="Örn: Bilgisayar Mühendisliği">
        </div>
        <div class="form-group">
          <label class="form-label">📊 Minimum GPA</label>
          <input type="number" class="form-input" id="filterMinGpa" placeholder="Örn: 3.0" step="0.01" min="0" max="4">
        </div>
      </div>

      <button class="btn btn-primary w-full" id="searchCandidatesBtn">🔍 Aday Ara</button>
    </div>

    <div id="searchResults">
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Aday Arama</h3>
        <p>Filtreleri kullanarak istediğiniz özelliklerde adayları bulun</p>
      </div>
    </div>
  `;

  let filterSkills = [];
  let filterLangs = [];

  // Add skill filter
  document.getElementById('addFilterSkillBtn').addEventListener('click', () => {
    const input = document.getElementById('filterSkillInput');
    const skill = input.value.trim();
    if (skill && !filterSkills.includes(skill)) {
      filterSkills.push(skill);
      renderFilterTags();
      input.value = '';
    }
  });

  // Add language filter
  document.getElementById('addFilterLangBtn').addEventListener('click', () => {
    const exam = document.getElementById('filterLangExam').value;
    const minScore = document.getElementById('filterLangMinScore').value;
    if (exam) {
      filterLangs.push({ exam, minScore: minScore || 0 });
      renderFilterTags();
      document.getElementById('filterLangExam').value = '';
      document.getElementById('filterLangMinScore').value = '';
    }
  });

  function renderFilterTags() {
    document.getElementById('filterSkillTags').innerHTML = filterSkills.map((s, i) =>
      `<span class="skill-tag">${s} <button class="remove-btn" data-type="skill" data-idx="${i}">✕</button></span>`
    ).join('');

    document.getElementById('filterLangTags').innerHTML = filterLangs.map((l, i) =>
      `<span class="skill-tag">${l.exam} ≥${l.minScore} <button class="remove-btn" data-type="lang" data-idx="${i}">✕</button></span>`
    ).join('');

    // Remove handlers
    document.querySelectorAll('#filterSkillTags .remove-btn, #filterLangTags .remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const idx = parseInt(btn.dataset.idx);
        if (type === 'skill') filterSkills.splice(idx, 1);
        else filterLangs.splice(idx, 1);
        renderFilterTags();
      });
    });
  }

  // Search
  document.getElementById('searchCandidatesBtn').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div style="display:flex;justify-content:center;padding:2rem;"><div class="spinner"></div></div>';

    const filters = {
      skills: filterSkills.length > 0 ? filterSkills : undefined,
      languages: filterLangs.length > 0 ? filterLangs : undefined,
      city: document.getElementById('filterCity').value.trim() || undefined,
      university: document.getElementById('filterUniversity').value.trim() || undefined,
      department: document.getElementById('filterDepartment').value.trim() || undefined,
      minGpa: document.getElementById('filterMinGpa').value || undefined
    };

    try {
      const data = await searchAPI.searchCandidates(filters);
      const candidates = data.candidates || [];

      if (candidates.length === 0) {
        resultsDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">😕</div>
            <h3>Aday Bulunamadı</h3>
            <p>Filtrelerinizi genişleterek tekrar deneyin</p>
          </div>
        `;
        return;
      }

      resultsDiv.innerHTML = `
        <div class="dashboard-header" style="margin-bottom:var(--space-4);">
          <h3>${candidates.length} aday bulundu</h3>
        </div>
        ${candidates.map(c => `
          <div class="card candidate-card" style="margin-bottom:var(--space-4);cursor:pointer;" data-student-id="${c.id}">
            <div style="display:flex;align-items:flex-start;gap:var(--space-4);">
              <div class="profile-avatar" style="width:56px;height:56px;font-size:var(--font-xl);flex-shrink:0;">
                ${(c.full_name || 'A')[0]}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2);flex-wrap:wrap;">
                  <span style="font-weight:700;font-size:var(--font-lg);">${c.full_name}</span>
                  <span class="badge badge-primary">%${c.profileCompletion} Profil</span>
                </div>
                <div class="text-sm text-muted" style="margin-bottom:var(--space-2);">
                  ${c.university || ''} ${c.department ? '• ' + c.department : ''} ${c.city ? '📍 ' + c.city : ''} ${c.gpa ? '• GPA: ' + c.gpa : ''}
                </div>

                <!-- Skills -->
                ${c.skills && c.skills.length > 0 ? `
                  <div style="margin-bottom:var(--space-2);">
                    <span class="text-xs text-muted">Beceriler: </span>
                    ${c.skills.map(s => `
                      <span class="skill-tag ${c.matchedSkills?.includes(s.skill_name) ? 'matched' : ''}" style="font-size:0.7rem;">
                        ${s.skill_name}
                        ${s.verification_type === 'certificate' ? ' 📜' : s.verification_type === 'reference' ? ' 📎' : ''}
                      </span>
                    `).join(' ')}
                  </div>
                ` : ''}

                <!-- Languages -->
                ${c.languages && c.languages.length > 0 ? `
                  <div style="margin-bottom:var(--space-2);">
                    <span class="text-xs text-muted">Diller: </span>
                    ${c.languages.map(l => `<span class="badge badge-accent" style="font-size:0.65rem;">${l.exam_type}: ${l.score}</span>`).join(' ')}
                  </div>
                ` : ''}

                <!-- References -->
                ${c.references && c.references.length > 0 ? `
                  <div>
                    <span class="text-xs text-muted">📎 ${c.references.length} referans mektubu</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Detay buttonu -->
            <div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);border-top:1px solid var(--border-color);padding-top:var(--space-3);">
              ${c.cv_url ? `<a href="${c.cv_url}" target="_blank" class="btn btn-ghost btn-sm">📄 CV</a>` : ''}
              <button class="btn btn-secondary btn-sm view-candidate-detail" data-id="${c.id}">👤 Profil Detayı</button>
            </div>
          </div>
        `).join('')}
      `;

      // View candidate detail
      resultsDiv.querySelectorAll('.view-candidate-detail').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          showCandidateDetail(btn.dataset.id, candidates);
        });
      });
    } catch (error) {
      resultsDiv.innerHTML = `<p class="text-muted" style="padding:var(--space-4);">⚠️ ${error.message}</p>`;
    }
  });
}

// ── Candidate Detail Modal (referanslar dahil) ──
function showCandidateDetail(studentId, candidates) {
  const c = candidates.find(x => String(x.id) === String(studentId));
  if (!c) return;

  const contextLabels = {
    'academic': '🎓 Akademik',
    'work': '💼 İş',
    'skill': '⚡ Beceri'
  };

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="max-width:750px;max-height:85vh;overflow-y:auto;">
      <div class="modal-header">
        <h2>👤 ${c.full_name}</h2>
        <button class="modal-close" id="closeCandidateDetail">✕</button>
      </div>

      <div style="padding:var(--space-4) var(--space-6);">
        <!-- Temel Bilgi -->
        <div style="margin-bottom:var(--space-5);">
          <div class="text-sm text-muted" style="margin-bottom:var(--space-2);">
            ${c.university || ''} ${c.department ? '• ' + c.department : ''} ${c.city ? '📍 ' + c.city : ''}
          </div>
          ${c.gpa ? `<div class="text-sm">📊 GPA: <strong>${c.gpa}</strong></div>` : ''}
          ${c.bio ? `<div class="text-sm" style="margin-top:var(--space-2);">${c.bio}</div>` : ''}
        </div>

        <!-- Beceriler -->
        ${c.skills && c.skills.length > 0 ? `
          <div style="margin-bottom:var(--space-5);">
            <h3 style="margin-bottom:var(--space-3);">⚡ Beceriler</h3>
            ${c.skills.map(s => `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--border-color);">
                <span style="font-weight:600;flex:1;">${s.skill_name}</span>
                <div class="skill-level">
                  ${Array.from({ length: 5 }, (_, i) => `<span class="skill-level-dot ${i < s.proficiency_level ? 'active' : ''}"></span>`).join('')}
                </div>
                ${s.verification_type === 'certificate' ? '<span class="badge badge-success" style="font-size:0.6rem;">📜 Sertifikalı</span>' : ''}
                ${s.verification_type === 'reference' ? `<span class="badge badge-accent" style="font-size:0.6rem;">📎 Referanslı</span>` : ''}
                ${s.certificate_url ? `<a href="${s.certificate_url}" target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.65rem;">PDF</a>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Dil Becerileri -->
        ${c.languages && c.languages.length > 0 ? `
          <div style="margin-bottom:var(--space-5);">
            <h3 style="margin-bottom:var(--space-3);">🌍 Dil Becerileri</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--space-3);">
              ${c.languages.map(l => `
                <div class="card" style="text-align:center;padding:var(--space-3);">
                  <div style="font-weight:700;">${l.exam_type}</div>
                  <div style="font-size:var(--font-xl);font-weight:800;color:var(--primary);">${l.score}</div>
                  ${l.certificate_url ? `<a href="${l.certificate_url}" target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.65rem;">📄 Belge</a>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Referans Mektupları -->
        ${c.references && c.references.length > 0 ? `
          <div style="margin-bottom:var(--space-5);">
            <h3 style="margin-bottom:var(--space-3);">📎 Referans Mektupları</h3>
            ${c.references.map(r => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--border-color);">
                <div>
                  <div style="font-weight:600;">${r.reference_name}</div>
                  <div class="text-xs text-muted">${r.reference_title || ''} ${r.institution ? '• ' + r.institution : ''}</div>
                  <span class="badge badge-primary" style="font-size:0.6rem;margin-top:2px;">${contextLabels[r.context] || '📎'}</span>
                </div>
                <a href="${r.letter_url}" target="_blank" class="btn btn-secondary btn-sm">📄 Mektubu Oku</a>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Linkler -->
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">
          ${c.cv_url ? `<a href="${c.cv_url}" target="_blank" class="btn btn-primary btn-sm">📄 CV</a>` : ''}
          ${c.linkedin_url ? `<a href="${c.linkedin_url}" target="_blank" class="btn btn-ghost btn-sm">🔗 LinkedIn</a>` : ''}
          ${c.github_url ? `<a href="${c.github_url}" target="_blank" class="btn btn-ghost btn-sm">🐙 GitHub</a>` : ''}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#closeCandidateDetail').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

async function showCandidates(jobId) {
  // Create modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal" style="max-width:700px;">
      <div class="modal-header">
        <h2>👥 Uygun Adaylar</h2>
        <button class="modal-close" id="closeCandidatesModal">✕</button>
      </div>
      <div id="candidatesList">
        <div style="display:flex;justify-content:center;padding:2rem;"><div class="spinner"></div></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#closeCandidatesModal').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  try {
    const data = await matchAPI.getCandidates(jobId);
    const candidates = data.candidates || [];

    const list = overlay.querySelector('#candidatesList');
    if (candidates.length === 0) {
      list.innerHTML = '<div class="empty-state" style="padding:var(--space-6);"><p class="text-muted">Henüz uygun aday bulunamadı</p></div>';
      return;
    }

    list.innerHTML = candidates.map(c => `
      <div style="display:flex;align-items:flex-start;gap:var(--space-4);padding:var(--space-4);border-bottom:1px solid var(--border-color);">
        <div class="profile-avatar" style="width:48px;height:48px;font-size:var(--font-lg);flex-shrink:0;">
          ${(c.full_name || 'A')[0]}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-1);flex-wrap:wrap;">
            <span style="font-weight:700;">${c.full_name}</span>
            <span class="badge ${c.matchScore >= 70 ? 'badge-success' : c.matchScore >= 40 ? 'badge-warning' : 'badge-error'}">%${c.matchScore}</span>
            ${c.hasApplied ? '<span class="badge badge-primary">Başvurdu</span>' : ''}
          </div>
          <div class="text-sm text-muted" style="margin-bottom:var(--space-2);">
            ${c.university || ''} ${c.department ? '• ' + c.department : ''} ${c.city ? '📍 ' + c.city : ''}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-1);margin-bottom:var(--space-2);">
            ${(c.matchedSkills || []).map(s => `<span class="skill-tag matched" style="font-size:0.65rem;">${s}</span>`).join('')}
            ${(c.missingSkills || []).map(s => `<span class="skill-tag missing" style="font-size:0.65rem;">${s}</span>`).join('')}
          </div>
          ${c.languages && c.languages.length > 0 ? `
            <div style="margin-bottom:var(--space-1);">
              ${c.languages.map(l => `<span class="badge badge-accent" style="font-size:0.6rem;">${l.exam_type}: ${l.score}</span>`).join(' ')}
            </div>
          ` : ''}
          ${c.references && c.references.length > 0 ? `<div class="text-xs text-muted">📎 ${c.references.length} referans</div>` : ''}
          ${c.cv_url ? `<a href="${c.cv_url}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:var(--space-2);">📄 CV</a>` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    overlay.querySelector('#candidatesList').innerHTML = `<p class="text-muted" style="padding:var(--space-4);">⚠️ ${error.message}</p>`;
  }
}

async function renderEmpNotifications(content) {
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
      <button class="btn btn-secondary btn-sm" id="markAllReadEmpBtn">✓ Tümünü Okundu Yap</button>
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
        <p>Yeni başvurular ve güncellemeler burada görünecek</p>
      </div>
    `}
  `;

  // Mark all read
  document.getElementById('markAllReadEmpBtn')?.addEventListener('click', async () => {
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
