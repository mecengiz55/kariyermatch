const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const sql = neon('postgresql://neondb_owner:npg_KuUAvq29xfwj@ep-wispy-bird-ag8pel3r-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function setup() {
    // 1. Update role constraint to include admin
    await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`;
    await sql`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'employer', 'admin'))`;
    console.log('✅ Admin role constraint eklendi');

    // 2. Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const existing = await sql`SELECT id FROM users WHERE email = 'admin@kariyermatch.com'`;
    if (existing.length === 0) {
        await sql`INSERT INTO users (email, password_hash, role, full_name) VALUES ('admin@kariyermatch.com', ${passwordHash}, 'admin', 'Admin')`;
        console.log('✅ Admin kullanıcı oluşturuldu: admin@kariyermatch.com / admin123');
    } else {
        console.log('ℹ️ Admin kullanıcı zaten var');
    }

    // 3. Create site_settings table for homepage customization
    await sql`CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
  )`;
    console.log('✅ site_settings tablosu oluşturuldu');

    // 4. Insert default settings
    const defaults = [
        ['site_title', 'KariyerMatch'],
        ['hero_title', 'Kariyerinizi Akıllıca Başlatın'],
        ['hero_subtitle', 'Becerilerinizi analiz eder, size en uygun staj ve iş fırsatlarını akıllı eşleştirme algoritması ile bulur.'],
        ['hero_cta', 'Hemen Başla'],
        ['announcement', '']
    ];

    for (const [key, value] of defaults) {
        await sql`INSERT INTO site_settings (setting_key, setting_value) VALUES (${key}, ${value}) ON CONFLICT (setting_key) DO NOTHING`;
    }
    console.log('✅ Varsayılan ayarlar eklendi');
    console.log('\n🎉 Admin kurulumu tamamlandı!');
}

setup().catch(e => console.error('Hata:', e.message));
