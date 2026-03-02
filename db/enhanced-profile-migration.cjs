// Enhanced Profile Migration
// Adds: student_languages, student_references tables + student_skills columns
const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_KuUAvq29xfwj@ep-wispy-bird-ag8pel3r-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function migrate() {
    console.log('🚀 Enhanced Profile migration başlıyor...');

    // 1. student_languages tablosu
    await sql`
    CREATE TABLE IF NOT EXISTS student_languages (
      id SERIAL PRIMARY KEY,
      student_id INT REFERENCES student_profiles(id) ON DELETE CASCADE,
      exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('TOEFL', 'IELTS', 'YDS', 'YÖKDİL')),
      score VARCHAR(10) NOT NULL,
      certificate_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, exam_type)
    )
  `;
    console.log('✅ student_languages tablosu oluşturuldu');

    // 2. student_references tablosu
    await sql`
    CREATE TABLE IF NOT EXISTS student_references (
      id SERIAL PRIMARY KEY,
      student_id INT REFERENCES student_profiles(id) ON DELETE CASCADE,
      reference_name VARCHAR(255) NOT NULL,
      reference_title VARCHAR(255),
      institution VARCHAR(255),
      letter_url TEXT NOT NULL,
      context VARCHAR(50) CHECK (context IN ('academic', 'work', 'skill')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
    console.log('✅ student_references tablosu oluşturuldu');

    // 3. student_skills ALTER — yeni kolonlar
    try {
        await sql`ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS certificate_url TEXT`;
        console.log('✅ student_skills.certificate_url eklendi');
    } catch (e) {
        console.log('ℹ️ certificate_url zaten var veya hata:', e.message);
    }

    try {
        await sql`ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS verification_type VARCHAR(20)`;
        console.log('✅ student_skills.verification_type eklendi');
    } catch (e) {
        console.log('ℹ️ verification_type zaten var veya hata:', e.message);
    }

    try {
        await sql`ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS reference_id INT REFERENCES student_references(id)`;
        console.log('✅ student_skills.reference_id eklendi');
    } catch (e) {
        console.log('ℹ️ reference_id zaten var veya hata:', e.message);
    }

    // 4. İndeksler
    try {
        await sql`CREATE INDEX IF NOT EXISTS idx_student_languages_student ON student_languages(student_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_student_references_student ON student_references(student_id)`;
        console.log('✅ İndeksler oluşturuldu');
    } catch (e) {
        console.log('ℹ️ İndeks hatası:', e.message);
    }

    console.log('\n🎉 Enhanced Profile migration tamamlandı!');
}

migrate().catch(err => {
    console.error('❌ Migration hatası:', err);
    process.exit(1);
});
