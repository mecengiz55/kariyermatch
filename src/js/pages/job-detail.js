// ── Job Detail Page ──
import { jobsAPI, applicationsAPI, getUser } from '../api.js';

export async function renderJobDetail(container, jobId) {
    container.innerHTML = `
    <div class="container" style="padding: var(--space-8) 0; max-width: 900px;">
      <div style="display:flex;justify-content:center;padding:4rem;"><div class="spinner"></div></div>
    </div>
  `;

    try {
        const data = await jobsAPI.get(jobId);
        const job = data.job;
        renderJobContent(container, job);
    } catch (error) {
        // Demo job
        renderJobContent(container, getDemoJob(jobId));
    }
}

function renderJobContent(container, job) {
    const user = getUser();
    const typeLabel = job.type === 'internship' ? '🎓 Staj' : '💼 İş';
    const typeBadge = job.type === 'internship' ? 'badge-accent' : 'badge-primary';
    const companyInitial = (job.company_name || 'Ş')[0].toUpperCase();
    const requirements = job.requirements || [];
    const salary = job.salary_min && job.salary_max
        ? `${(job.salary_min / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k ₺/ay`
        : job.salary_min ? `${(job.salary_min / 1000).toFixed(0)}k+ ₺/ay` : 'Belirtilmemiş';

    container.innerHTML = `
    <div class="container" style="padding: var(--space-8) 0; max-width: 900px;">
      <a href="#/jobs" class="btn btn-ghost btn-sm" style="margin-bottom: var(--space-6);">← İlanlara Dön</a>

      <div class="card" style="margin-bottom: var(--space-6);">
        <div style="display:flex;align-items:flex-start;gap:var(--space-5);margin-bottom:var(--space-6);">
          <div class="job-company-logo" style="width:64px;height:64px;font-size:var(--font-2xl);">${companyInitial}</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-2);">
              <h1 style="font-size:var(--font-2xl);font-weight:800;">${job.title}</h1>
              <span class="badge ${typeBadge}">${typeLabel}</span>
            </div>
            <p style="color:var(--text-secondary);font-size:var(--font-lg);">${job.company_name || 'Şirket'}</p>
          </div>
          ${job.matchScore !== undefined ? `
            <div class="score-circle ${job.matchScore >= 70 ? 'score-high' : job.matchScore >= 40 ? 'score-mid' : 'score-low'}" style="--score-pct:${job.matchScore}%;">
              %${job.matchScore}
            </div>
          ` : ''}
        </div>

        <!-- Meta -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-6);">
          <div class="stat-card">
            <div style="color:var(--text-muted);font-size:var(--font-xs);margin-bottom:var(--space-1);">📍 Konum</div>
            <div style="font-weight:600;">${job.location || 'Belirtilmemiş'} ${job.is_remote ? '(Uzaktan)' : ''}</div>
          </div>
          <div class="stat-card">
            <div style="color:var(--text-muted);font-size:var(--font-xs);margin-bottom:var(--space-1);">💰 Maaş</div>
            <div style="font-weight:600;">${salary}</div>
          </div>
          <div class="stat-card">
            <div style="color:var(--text-muted);font-size:var(--font-xs);margin-bottom:var(--space-1);">📅 Son Başvuru</div>
            <div style="font-weight:600;">${job.deadline ? new Date(job.deadline).toLocaleDateString('tr-TR') : 'Süresiz'}</div>
          </div>
        </div>

        <!-- Description -->
        <div style="margin-bottom:var(--space-6);">
          <h3 style="margin-bottom:var(--space-3);">📝 İlan Açıklaması</h3>
          <div style="color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;">${job.description || 'Açıklama eklenmemiş.'}</div>
        </div>

        <!-- Requirements -->
        ${requirements.length > 0 ? `
          <div style="margin-bottom:var(--space-6);">
            <h3 style="margin-bottom:var(--space-3);">🎯 Aranan Beceriler</h3>
            <div style="display:flex;flex-wrap:wrap;gap:var(--space-2);">
              ${requirements.map(req => {
        const isMatched = job.matchedSkills && job.matchedSkills.includes(req.skill_name);
        const isMissing = job.missingSkills && job.missingSkills.includes(req.skill_name);
        const tagClass = isMatched ? 'matched' : isMissing ? 'missing' : '';
        const icon = isMatched ? '✓' : isMissing ? '✗' : '';
        return `
                  <span class="skill-tag ${tagClass}">
                    ${icon} ${req.skill_name}
                    ${req.is_required ? '' : '<span style="opacity:0.6">(tercih)</span>'}
                    <span class="skill-level">${Array.from({ length: 5 }, (_, i) => `<span class="skill-level-dot ${i < (req.min_proficiency || 1) ? 'active' : ''}"></span>`).join('')}</span>
                  </span>
                `;
    }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Company Info -->
        ${(job.company_description || job.website) ? `
          <div style="margin-bottom:var(--space-6);">
            <h3 style="margin-bottom:var(--space-3);">🏢 Şirket Hakkında</h3>
            ${job.company_description ? `<p style="color:var(--text-secondary);line-height:1.7;margin-bottom:var(--space-3);">${job.company_description}</p>` : ''}
            ${job.website ? `<a href="${job.website}" target="_blank" class="btn btn-ghost btn-sm">🌐 Web Sitesi →</a>` : ''}
          </div>
        ` : ''}

        <!-- Apply Button -->
        <div style="border-top:1px solid var(--border-color);padding-top:var(--space-6);display:flex;gap:var(--space-4);align-items:center;flex-wrap:wrap;">
          ${user && user.role === 'student' ? (
            job.hasApplied ? `
              <div class="badge badge-success" style="padding:var(--space-3) var(--space-5);font-size:var(--font-sm);">
                ✓ Bu ilana başvurdunuz (${getStatusLabel(job.applicationStatus)})
              </div>
            ` : `
              <button class="btn btn-primary btn-lg" id="applyBtn">
                🚀 Başvur
              </button>
              <span style="color:var(--text-muted);font-size:var(--font-sm);">Profilinizdeki bilgileriniz ile başvurulacak</span>
            `
        ) : user && user.role === 'employer' ? '' : `
            <a href="#/login" class="btn btn-primary btn-lg">Başvurmak için giriş yapın</a>
          `}
        </div>
      </div>
    </div>
  `;

    // Apply button
    const applyBtn = document.getElementById('applyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            applyBtn.disabled = true;
            applyBtn.textContent = 'Başvuruluyor...';
            try {
                await applicationsAPI.apply({ jobId: job.id });
                window.showToast('Başvurunuz başarıyla gönderildi! 🎉', 'success');
                applyBtn.outerHTML = `<div class="badge badge-success" style="padding:var(--space-3) var(--space-5);font-size:var(--font-sm);">✓ Başvuruldu</div>`;
            } catch (error) {
                window.showToast(error.message, 'error');
                applyBtn.disabled = false;
                applyBtn.textContent = '🚀 Başvur';
            }
        });
    }
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Beklemede',
        reviewed: 'İncelendi',
        accepted: 'Kabul Edildi',
        rejected: 'Reddedildi'
    };
    return labels[status] || 'Beklemede';
}

function getDemoJob(id) {
    return {
        id, title: 'Frontend Developer', company_name: 'TechCorp', type: 'job',
        location: 'İstanbul', is_remote: true, salary_min: 25000, salary_max: 40000,
        description: 'Modern web uygulamaları geliştirmek üzere deneyimli bir Frontend Developer arıyoruz.\n\nSorumluluklar:\n- React/Vue.js ile kullanıcı arayüzü geliştirme\n- Responsive ve performanslı UI tasarımı\n- API entegrasyonları\n- Kod kalitesi ve test\n\nSunduğumuz İmkanlar:\n- Esnek çalışma saatleri\n- Uzaktan çalışma imkanı\n- Eğitim bütçesi\n- Özel sağlık sigortası',
        deadline: new Date(Date.now() + 2592000000).toISOString(),
        requirements: [
            { skill_name: 'JavaScript', min_proficiency: 4, is_required: true },
            { skill_name: 'React', min_proficiency: 3, is_required: true },
            { skill_name: 'CSS', min_proficiency: 3, is_required: true },
            { skill_name: 'TypeScript', min_proficiency: 2, is_required: false },
            { skill_name: 'Git', min_proficiency: 2, is_required: true },
        ]
    };
}
