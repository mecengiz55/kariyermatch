// ── Home Page ──

export async function renderHome(container) {
    container.innerHTML = `
    <!-- Hero Section -->
    <section class="hero">
      <div class="container">
        <h1 class="hero-title animate-in">
          Kariyerinizi<br>
          <span class="gradient-text">Akıllıca</span> Başlatın
        </h1>
        <p class="hero-subtitle animate-in animate-delay-1">
          Becerilerinize en uygun iş ve staj fırsatlarını yapay zeka destekli eşleştirme sistemiyle keşfedin. 
          Öğrenciler ve işverenler burada buluşuyor.
        </p>
        <div class="hero-actions animate-in animate-delay-2">
          <a href="#/register" class="btn btn-primary btn-lg">
            🚀 Hemen Başla
          </a>
          <a href="#/jobs" class="btn btn-secondary btn-lg">
            📋 İlanları Gör
          </a>
        </div>

        <div class="hero-stats animate-in animate-delay-3">
          <div class="hero-stat">
            <div class="hero-stat-value" id="statStudents">500+</div>
            <div class="hero-stat-label">Aktif Öğrenci</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value" id="statJobs">150+</div>
            <div class="hero-stat-label">İş İlanı</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value" id="statCompanies">80+</div>
            <div class="hero-stat-label">Şirket</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value" id="statMatches">95%</div>
            <div class="hero-stat-label">Eşleşme Başarısı</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">Neden KariyerMatch?</h2>
        <p class="section-subtitle">Akıllı eşleştirme algoritmamız sayesinde doğru kişiyi doğru pozisyonla buluşturuyoruz</p>
        
        <div class="features-grid">
          <div class="feature-card animate-in">
            <div class="feature-icon">🎯</div>
            <h3>Akıllı Eşleştirme</h3>
            <p>Becerileriniz ve deneyiminize göre en uygun ilanlarla otomatik eşleştirme. %95+ doğruluk oranı.</p>
          </div>
          <div class="feature-card animate-in animate-delay-1">
            <div class="feature-icon">📊</div>
            <h3>Eşleşme Skoru</h3>
            <p>Her ilan için kişiselleştirilmiş eşleşme skoru. Hangi becerilerin eşleştiğini ve eksik olanları görün.</p>
          </div>
          <div class="feature-card animate-in animate-delay-2">
            <div class="feature-icon">🚀</div>
            <h3>Hızlı Başvuru</h3>
            <p>Profilinizi bir kez oluşturun, sonra tek tıkla başvuru yapın. Zaman kaybetmeyin.</p>
          </div>
          <div class="feature-card animate-in animate-delay-1">
            <div class="feature-icon">🏢</div>
            <h3>İşverenler İçin</h3>
            <p>İlanınıza en uygun adayları otomatik sıralama ile görün. Doğru kişiyi hızla bulun.</p>
          </div>
          <div class="feature-card animate-in animate-delay-2">
            <div class="feature-icon">📈</div>
            <h3>Kariyer Takibi</h3>
            <p>Başvurularınızın durumunu gerçek zamanlı takip edin. Kabul, red veya inceleme aşamalarını görün.</p>
          </div>
          <div class="feature-card animate-in animate-delay-3">
            <div class="feature-icon">🔒</div>
            <h3>Güvenli Platform</h3>
            <p>Verileriniz şifreli olarak saklanır. Güvenli kimlik doğrulama ile bilgileriniz koruma altında.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="how-it-works">
      <div class="container">
        <h2 class="section-title">Nasıl Çalışır?</h2>
        <p class="section-subtitle">3 basit adımda kariyer yolculuğunuza başlayın</p>
        
        <div class="steps">
          <div class="step animate-in">
            <div class="step-number">1</div>
            <h3>Profil Oluşturun</h3>
            <p>Eğitim bilgilerinizi, becerilerinizi ve deneyimlerinizi ekleyin</p>
          </div>
          <div class="step animate-in animate-delay-1">
            <div class="step-number">2</div>
            <h3>Eşleşmeleri Görün</h3>
            <p>Sistem otomatik olarak size en uygun ilanları bulur ve sıralar</p>
          </div>
          <div class="step animate-in animate-delay-2">
            <div class="step-number">3</div>
            <h3>Başvurun</h3>
            <p>Beğendiğiniz ilanlara tek tıkla başvuru yapın ve süreçi takip edin</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section style="padding: var(--space-20) 0;">
      <div class="container">
        <div class="card" style="text-align:center; padding: var(--space-12); background: var(--gradient-card); border-color: rgba(99,102,241,0.3);">
          <h2 style="font-size: var(--font-3xl); font-weight: 800; margin-bottom: var(--space-4);">
            Kariyerinize Bugün Başlayın 🚀
          </h2>
          <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto var(--space-8); font-size: var(--font-lg);">
            Ücretsiz hesap oluşturun ve becerilerinize en uygun fırsatları keşfetmeye başlayın.
          </p>
          <div style="display: flex; gap: var(--space-4); justify-content: center; flex-wrap: wrap;">
            <a href="#/register" class="btn btn-primary btn-lg">👨‍🎓 Öğrenci Olarak Kayıt Ol</a>
            <a href="#/register" class="btn btn-accent btn-lg">🏢 İşveren Olarak Kayıt Ol</a>
          </div>
        </div>
      </div>
    </section>
  `;

    // Animate stats counter
    animateCounters();
}

function animateCounters() {
    const counters = [
        { el: document.getElementById('statStudents'), target: 500, suffix: '+' },
        { el: document.getElementById('statJobs'), target: 150, suffix: '+' },
        { el: document.getElementById('statCompanies'), target: 80, suffix: '+' },
        { el: document.getElementById('statMatches'), target: 95, suffix: '%' },
    ];

    counters.forEach(({ el, target, suffix }) => {
        if (!el) return;
        let current = 0;
        const step = Math.ceil(target / 40);
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = current + suffix;
        }, 30);
    });
}
