// ── Auth Pages (Login & Register) ──
import { authAPI, setToken, setUser } from '../api.js';

export function renderLogin(container) {
    container.innerHTML = `
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <div class="logo-icon" style="width:56px;height:56px;font-size:1.5rem;margin:0 auto var(--space-4);border-radius:var(--radius-xl);box-shadow:var(--shadow-glow);">🎯</div>
            <h1>Tekrar Hoş Geldiniz</h1>
            <p>Hesabınıza giriş yapın</p>
          </div>
          
          <form id="loginForm">
            <div class="form-group">
              <label class="form-label">📧 E-posta</label>
              <input type="email" class="form-input" id="loginEmail" placeholder="ornek@email.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">🔒 Şifre</label>
              <input type="password" class="form-input" id="loginPassword" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-primary w-full btn-lg" id="loginBtn">
              Giriş Yap
            </button>
          </form>

          <div class="auth-footer">
            Hesabınız yok mu? <a href="#/register">Hemen kayıt olun</a>
          </div>
        </div>
      </div>
    </div>
  `;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.textContent = 'Giriş yapılıyor...';

        try {
            const data = await authAPI.login({
                email: document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value
            });

            setToken(data.token);
            setUser(data.user);
            window.showToast('Başarıyla giriş yapıldı!', 'success');
            window.location.hash = '#/dashboard';
        } catch (error) {
            window.showToast(error.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Giriş Yap';
        }
    });
}

export function renderRegister(container) {
    let selectedRole = 'student';

    container.innerHTML = `
    <div class="auth-page">
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <div class="logo-icon" style="width:56px;height:56px;font-size:1.5rem;margin:0 auto var(--space-4);border-radius:var(--radius-xl);box-shadow:var(--shadow-glow);">🎯</div>
            <h1>Hesap Oluşturun</h1>
            <p>KariyerMatch'e katılın</p>
          </div>

          <div class="role-toggle" id="roleToggle">
            <button class="role-btn active" data-role="student">👨‍🎓 Öğrenci</button>
            <button class="role-btn" data-role="employer">🏢 İşveren</button>
          </div>
          
          <form id="registerForm">
            <div class="form-group">
              <label class="form-label">👤 Ad Soyad</label>
              <input type="text" class="form-input" id="regName" placeholder="Adınız Soyadınız" required>
            </div>
            <div class="form-group">
              <label class="form-label">📧 E-posta</label>
              <input type="email" class="form-input" id="regEmail" placeholder="ornek@email.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">🔒 Şifre</label>
              <input type="password" class="form-input" id="regPassword" placeholder="En az 6 karakter" minlength="6" required>
            </div>
            <div class="form-group">
              <label class="form-label">🔒 Şifre Tekrar</label>
              <input type="password" class="form-input" id="regPasswordConfirm" placeholder="Şifrenizi tekrar girin" required>
            </div>
            <button type="submit" class="btn btn-primary w-full btn-lg" id="registerBtn">
              Kayıt Ol
            </button>
          </form>

          <div class="auth-footer">
            Zaten hesabınız var mı? <a href="#/login">Giriş yapın</a>
          </div>
        </div>
      </div>
    </div>
  `;

    // Role toggle
    document.getElementById('roleToggle').addEventListener('click', (e) => {
        const btn = e.target.closest('.role-btn');
        if (!btn) return;
        selectedRole = btn.dataset.role;
        document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('registerBtn');
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;

        if (password !== confirm) {
            window.showToast('Şifreler eşleşmiyor', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Kayıt yapılıyor...';

        try {
            const data = await authAPI.register({
                fullName: document.getElementById('regName').value,
                email: document.getElementById('regEmail').value,
                password,
                role: selectedRole
            });

            setToken(data.token);
            setUser(data.user);
            window.showToast('Hesabınız oluşturuldu! 🎉', 'success');
            window.location.hash = '#/profile';
        } catch (error) {
            window.showToast(error.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Kayıt Ol';
        }
    });
}
