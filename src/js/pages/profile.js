// ── Profile Edit Page ──
import { getUser, studentsAPI, employersAPI } from '../api.js';

export async function renderProfile(container) {
    const user = getUser();
    if (!user) { window.location.hash = '#/login'; return; }

    if (user.role === 'student') {
        await renderStudentProfile(container);
    } else {
        await renderEmployerProfile(container);
    }
}

async function renderStudentProfile(container) {
    const user = getUser();
    let profile = {};

    try {
        const data = await studentsAPI.getProfile();
        profile = data.profile || {};
    } catch (e) { /* new profile */ }

    container.innerHTML = `
    <div class="container" style="max-width:800px;padding:var(--space-8) var(--space-6);">
      <a href="#/dashboard" class="btn btn-ghost btn-sm" style="margin-bottom:var(--space-6);">← Dashboard'a Dön</a>

      <div class="profile-header">
        <div class="profile-avatar">
          ${(user.fullName || 'K')[0].toUpperCase()}
        </div>
        <div class="profile-info">
          <h2>${user.fullName}</h2>
          <p>${user.email} • Öğrenci</p>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:var(--space-6);">📝 Profil Bilgileri</h3>
        <form id="profileForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">👤 Ad Soyad</label>
              <input type="text" class="form-input" id="pFullName" value="${user.fullName || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">📱 Telefon</label>
              <input type="tel" class="form-input" id="pPhone" value="${profile.phone || ''}" placeholder="05XX XXX XX XX">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🏫 Üniversite</label>
              <input type="text" class="form-input" id="pUniversity" value="${profile.university || ''}" placeholder="Üniversite adı">
            </div>
            <div class="form-group">
              <label class="form-label">📚 Bölüm</label>
              <input type="text" class="form-input" id="pDepartment" value="${profile.department || ''}" placeholder="Bölüm adı">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🎓 Mezuniyet Yılı</label>
              <input type="number" class="form-input" id="pGradYear" value="${profile.graduation_year || ''}" placeholder="2026">
            </div>
            <div class="form-group">
              <label class="form-label">📊 GPA (Not Ort.)</label>
              <input type="number" class="form-input" id="pGpa" value="${profile.gpa || ''}" placeholder="3.50" step="0.01" min="0" max="4">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">📍 Şehir</label>
            <input type="text" class="form-input" id="pCity" value="${profile.city || ''}" placeholder="Yaşadığınız şehir">
          </div>

          <div class="form-group">
            <label class="form-label">📝 Hakkımda</label>
            <textarea class="form-textarea" id="pBio" placeholder="Kendinizi kısaca tanıtın...">${profile.bio || ''}</textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🔗 LinkedIn URL</label>
              <input type="url" class="form-input" id="pLinkedin" value="${profile.linkedin_url || ''}" placeholder="https://linkedin.com/in/...">
            </div>
            <div class="form-group">
              <label class="form-label">🐙 GitHub URL</label>
              <input type="url" class="form-input" id="pGithub" value="${profile.github_url || ''}" placeholder="https://github.com/...">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">📄 CV URL (Google Drive, Dropbox vb.)</label>
            <input type="url" class="form-input" id="pCvUrl" value="${profile.cv_url || ''}" placeholder="https://drive.google.com/...">
            <p class="form-hint">CV'nizi bir bulut depolama servisine yükleyip linkini yapıştırın</p>
          </div>

          <button type="submit" class="btn btn-primary btn-lg w-full" id="saveProfileBtn">💾 Profili Kaydet</button>
        </form>
      </div>
    </div>
  `;

    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveProfileBtn');
        btn.disabled = true;
        btn.textContent = 'Kaydediliyor...';

        try {
            await studentsAPI.updateProfile({
                fullName: document.getElementById('pFullName').value,
                phone: document.getElementById('pPhone').value,
                university: document.getElementById('pUniversity').value,
                department: document.getElementById('pDepartment').value,
                graduationYear: parseInt(document.getElementById('pGradYear').value) || null,
                gpa: parseFloat(document.getElementById('pGpa').value) || null,
                city: document.getElementById('pCity').value,
                bio: document.getElementById('pBio').value,
                linkedinUrl: document.getElementById('pLinkedin').value,
                githubUrl: document.getElementById('pGithub').value,
                cvUrl: document.getElementById('pCvUrl').value
            });

            window.showToast('Profil başarıyla güncellendi! ✅', 'success');
            btn.disabled = false;
            btn.textContent = '💾 Profili Kaydet';
        } catch (error) {
            window.showToast(error.message, 'error');
            btn.disabled = false;
            btn.textContent = '💾 Profili Kaydet';
        }
    });
}

async function renderEmployerProfile(container) {
    const user = getUser();
    let profile = {};

    try {
        const data = await employersAPI.getProfile();
        profile = data.profile || {};
    } catch (e) { /* new profile */ }

    container.innerHTML = `
    <div class="container" style="max-width:800px;padding:var(--space-8) var(--space-6);">
      <a href="#/dashboard" class="btn btn-ghost btn-sm" style="margin-bottom:var(--space-6);">← Dashboard'a Dön</a>

      <div class="profile-header">
        <div class="profile-avatar" style="background:var(--gradient-accent);">
          ${(profile.company_name || user.fullName || 'İ')[0].toUpperCase()}
        </div>
        <div class="profile-info">
          <h2>${profile.company_name || user.fullName}</h2>
          <p>${user.email} • İşveren</p>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:var(--space-6);">🏢 Şirket Bilgileri</h3>
        <form id="employerForm">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">🏢 Şirket Adı</label>
              <input type="text" class="form-input" id="epCompanyName" value="${profile.company_name || ''}" placeholder="Şirket adı">
            </div>
            <div class="form-group">
              <label class="form-label">🏭 Sektör</label>
              <input type="text" class="form-input" id="epIndustry" value="${profile.industry || ''}" placeholder="Örn: Teknoloji, Finans...">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">👥 Şirket Büyüklüğü</label>
              <select class="form-select" id="epSize">
                <option value="">Seçin</option>
                <option value="1-10" ${profile.company_size === '1-10' ? 'selected' : ''}>1-10 çalışan</option>
                <option value="11-50" ${profile.company_size === '11-50' ? 'selected' : ''}>11-50 çalışan</option>
                <option value="51-200" ${profile.company_size === '51-200' ? 'selected' : ''}>51-200 çalışan</option>
                <option value="201-500" ${profile.company_size === '201-500' ? 'selected' : ''}>201-500 çalışan</option>
                <option value="500+" ${profile.company_size === '500+' ? 'selected' : ''}>500+ çalışan</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">📍 Şehir</label>
              <input type="text" class="form-input" id="epCity" value="${profile.city || ''}" placeholder="Şirket merkezi">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">🌐 Web Sitesi</label>
            <input type="url" class="form-input" id="epWebsite" value="${profile.website || ''}" placeholder="https://sirket.com">
          </div>

          <div class="form-group">
            <label class="form-label">📝 Şirket Tanıtımı</label>
            <textarea class="form-textarea" id="epDescription" placeholder="Şirketinizi tanıtın...">${profile.description || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">🖼️ Logo URL</label>
            <input type="url" class="form-input" id="epLogoUrl" value="${profile.logo_url || ''}" placeholder="https://...logo.png">
          </div>

          <button type="submit" class="btn btn-accent btn-lg w-full" id="saveEmpProfileBtn">💾 Profili Kaydet</button>
        </form>
      </div>
    </div>
  `;

    document.getElementById('employerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveEmpProfileBtn');
        btn.disabled = true;
        btn.textContent = 'Kaydediliyor...';

        try {
            await employersAPI.updateProfile({
                companyName: document.getElementById('epCompanyName').value,
                industry: document.getElementById('epIndustry').value,
                companySize: document.getElementById('epSize').value,
                city: document.getElementById('epCity').value,
                website: document.getElementById('epWebsite').value,
                description: document.getElementById('epDescription').value,
                logoUrl: document.getElementById('epLogoUrl').value
            });

            window.showToast('Profil başarıyla güncellendi! ✅', 'success');
            btn.disabled = false;
            btn.textContent = '💾 Profili Kaydet';
        } catch (error) {
            window.showToast(error.message, 'error');
            btn.disabled = false;
            btn.textContent = '💾 Profili Kaydet';
        }
    });
}
