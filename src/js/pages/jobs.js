// ── Jobs Listing Page ──
import { jobsAPI, getUser } from '../api.js';

export async function renderJobs(container, params = new URLSearchParams()) {
    const type = params.get('type') || 'all';
    const search = params.get('search') || '';
    const page = parseInt(params.get('page')) || 1;

    container.innerHTML = `
    <div class="container" style="padding-top: var(--space-8); padding-bottom: var(--space-8);">
      <div class="dashboard-header">
        <div>
          <h1 style="font-size: var(--font-3xl); font-weight: 800;">İş & Staj İlanları</h1>
          <p style="color: var(--text-secondary); margin-top: var(--space-2);">Becerilerinize uygun fırsatları keşfedin</p>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="search-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" id="jobSearch" placeholder="Pozisyon, şirket veya beceri ara..." value="${search}">
        </div>
        <div class="filter-group">
          <select class="form-select" id="jobTypeFilter" style="width:auto;min-width:160px;">
            <option value="all" ${type === 'all' ? 'selected' : ''}>Tüm İlanlar</option>
            <option value="job" ${type === 'job' ? 'selected' : ''}>💼 İş İlanları</option>
            <option value="internship" ${type === 'internship' ? 'selected' : ''}>🎓 Staj İlanları</option>
          </select>
          <button class="btn btn-primary" id="searchBtn">Ara</button>
        </div>
      </div>

      <!-- Results -->
      <div id="jobsContainer">
        <div style="display:flex;justify-content:center;padding:4rem;">
          <div class="spinner"></div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" id="pagination"></div>
    </div>
  `;

    // Load jobs
    await loadJobs(type, search, page);

    // Event listeners
    document.getElementById('searchBtn').addEventListener('click', () => {
        const searchVal = document.getElementById('jobSearch').value;
        const typeVal = document.getElementById('jobTypeFilter').value;
        window.location.hash = `#/jobs?search=${encodeURIComponent(searchVal)}&type=${typeVal}`;
    });

    document.getElementById('jobSearch').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('searchBtn').click();
        }
    });

    document.getElementById('jobTypeFilter').addEventListener('change', () => {
        document.getElementById('searchBtn').click();
    });
}

async function loadJobs(type, search, page) {
    const jobsContainer = document.getElementById('jobsContainer');
    const paginationContainer = document.getElementById('pagination');
    const user = getUser();

    try {
        const params = { page, limit: 12 };
        if (type !== 'all') params.type = type;
        if (search) params.search = search;

        const data = await jobsAPI.list(params);
        const jobs = data.jobs || [];
        const total = data.total || 0;
        const totalPages = Math.ceil(total / 12);

        if (jobs.length === 0) {
            jobsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>İlan Bulunamadı</h3>
          <p>Arama kriterlerinizi değiştirmeyi deneyin</p>
        </div>
      `;
            paginationContainer.innerHTML = '';
            return;
        }

        jobsContainer.innerHTML = `
      <p style="color:var(--text-muted);font-size:var(--font-sm);margin-bottom:var(--space-4);">${total} ilan bulundu</p>
      <div class="jobs-grid">
        ${jobs.map((job, i) => renderJobCard(job, i)).join('')}
      </div>
    `;

        // Pagination
        if (totalPages > 1) {
            let paginationHTML = '';
            if (page > 1) {
                paginationHTML += `<button onclick="location.hash='#/jobs?page=${page - 1}&type=${type}&search=${search}'">‹</button>`;
            }
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `<button class="${i === page ? 'active' : ''}" onclick="location.hash='#/jobs?page=${i}&type=${type}&search=${search}'">${i}</button>`;
            }
            if (page < totalPages) {
                paginationHTML += `<button onclick="location.hash='#/jobs?page=${page + 1}&type=${type}&search=${search}'">›</button>`;
            }
            paginationContainer.innerHTML = paginationHTML;
        }

    } catch (error) {
        // Demo verisi göster (API yokken)
        jobsContainer.innerHTML = renderDemoJobs();
        paginationContainer.innerHTML = '';
    }
}

function renderJobCard(job, index) {
    const typeLabel = job.type === 'internship' ? '🎓 Staj' : '💼 İş';
    const typeBadge = job.type === 'internship' ? 'badge-accent' : 'badge-primary';
    const companyInitial = (job.company_name || 'Ş')[0].toUpperCase();
    const requirements = job.requirements || [];
    const salary = job.salary_min && job.salary_max
        ? `${(job.salary_min / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k ₺`
        : job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k+ ₺` : '';
    const posted = job.created_at ? getTimeAgo(new Date(job.created_at)) : '';

    return `
    <div class="job-card animate-in animate-delay-${(index % 4) + 1}" onclick="location.hash='#/jobs/${job.id}'">
      <div class="job-card-header">
        <div class="job-company-logo">${companyInitial}</div>
        <div class="job-card-info">
          <h3>${job.title}</h3>
          <div class="job-card-company">${job.company_name || 'Şirket'}</div>
        </div>
        <span class="badge ${typeBadge}">${typeLabel}</span>
      </div>
      <div class="job-card-meta">
        ${job.location ? `<span>📍 ${job.location}</span>` : ''}
        ${job.is_remote ? '<span>🏠 Uzaktan</span>' : ''}
        ${salary ? `<span>💰 ${salary}</span>` : ''}
        ${posted ? `<span>🕐 ${posted}</span>` : ''}
      </div>
      <div class="job-card-skills">
        ${requirements.slice(0, 4).map(r =>
        `<span class="skill-tag">${r.skill_name}</span>`
    ).join('')}
        ${requirements.length > 4 ? `<span class="skill-tag">+${requirements.length - 4}</span>` : ''}
      </div>
      ${job.matchScore !== undefined ? `
        <div class="job-card-footer">
          <span style="font-size:var(--font-sm);color:var(--text-secondary);">Eşleşme</span>
          <div class="score-circle ${job.matchScore >= 70 ? 'score-high' : job.matchScore >= 40 ? 'score-mid' : 'score-low'}" style="width:44px;height:44px;font-size:var(--font-sm);">
            %${job.matchScore}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderDemoJobs() {
    const demoJobs = [
        {
            id: 1, title: 'Frontend Developer', company_name: 'TechCorp', type: 'job',
            location: 'İstanbul', is_remote: true, salary_min: 25000, salary_max: 40000,
            requirements: [{ skill_name: 'JavaScript' }, { skill_name: 'React' }, { skill_name: 'CSS' }],
            created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
            id: 2, title: 'Backend Stajyer', company_name: 'DataSoft', type: 'internship',
            location: 'Ankara', is_remote: false, salary_min: 12000, salary_max: 15000,
            requirements: [{ skill_name: 'Python' }, { skill_name: 'SQL' }, { skill_name: 'Django' }],
            created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
            id: 3, title: 'Full Stack Developer', company_name: 'InnovaLab', type: 'job',
            location: 'İstanbul', is_remote: true, salary_min: 30000, salary_max: 50000,
            requirements: [{ skill_name: 'Node.js' }, { skill_name: 'React' }, { skill_name: 'PostgreSQL' }, { skill_name: 'Docker' }],
            created_at: new Date(Date.now() - 259200000).toISOString()
        },
        {
            id: 4, title: 'UI/UX Tasarım Stajyeri', company_name: 'DesignHub', type: 'internship',
            location: 'İzmir', is_remote: true, salary_min: 10000, salary_max: 13000,
            requirements: [{ skill_name: 'Figma' }, { skill_name: 'Adobe XD' }, { skill_name: 'CSS' }],
            created_at: new Date(Date.now() - 345600000).toISOString()
        },
        {
            id: 5, title: 'Veri Analisti', company_name: 'AnalyticsPlus', type: 'job',
            location: 'Ankara', is_remote: false, salary_min: 20000, salary_max: 35000,
            requirements: [{ skill_name: 'Python' }, { skill_name: 'SQL' }, { skill_name: 'Excel' }, { skill_name: 'Power BI' }],
            created_at: new Date(Date.now() - 432000000).toISOString()
        },
        {
            id: 6, title: 'Mobil Uygulama Geliştirici', company_name: 'AppMasters', type: 'job',
            location: 'İstanbul', is_remote: true, salary_min: 28000, salary_max: 45000,
            requirements: [{ skill_name: 'React Native' }, { skill_name: 'TypeScript' }, { skill_name: 'Firebase' }],
            created_at: new Date(Date.now() - 518400000).toISOString()
        }
    ];

    return `
    <div class="card" style="margin-bottom:var(--space-4);padding:var(--space-4);background:rgba(245,158,11,0.1);border-color:rgba(245,158,11,0.3);">
      <p style="font-size:var(--font-sm);color:var(--warning-light);">⚠️ Demo modu - Veritabanı bağlantısı kurulduktan sonra gerçek ilanlar gösterilecek</p>
    </div>
    <div class="jobs-grid">
      ${demoJobs.map((job, i) => renderJobCard(job, i)).join('')}
    </div>
  `;
}

function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)} dk önce`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} saat önce`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} gün önce`;
    return `${Math.floor(seconds / 604800)} hafta önce`;
}

export { renderJobCard, getTimeAgo };
