const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_KuUAvq29xfwj@ep-wispy-bird-ag8pel3r-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function migrate() {
    // Bildirimler tablosu
    await sql`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      link VARCHAR(500),
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    console.log('✅ notifications tablosu oluşturuldu');

    // İndeksler
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read)`;
    console.log('✅ İndeksler oluşturuldu');

    console.log('\n🎉 Bildirim sistemi migration tamamlandı!');
}

migrate().catch(e => console.error('Hata:', e.message));
