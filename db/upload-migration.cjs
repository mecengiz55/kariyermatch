const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_KuUAvq29xfwj@ep-wispy-bird-ag8pel3r-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function migrate() {
    await sql`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id SERIAL PRIMARY KEY,
      file_key VARCHAR(255) UNIQUE NOT NULL,
      user_id INT NOT NULL,
      file_name VARCHAR(255),
      mime_type VARCHAR(100),
      file_data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
    console.log('✅ uploaded_files tablosu oluşturuldu');

    await sql`CREATE INDEX IF NOT EXISTS idx_uploaded_files_key ON uploaded_files(file_key)`;
    console.log('✅ index oluşturuldu');

    console.log('🎉 Upload migration tamamlandı!');
}

migrate().catch(e => console.error('Hata:', e.message));
