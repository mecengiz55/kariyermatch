// Migration: student_languages tablosuna exam_date ve expiry_date kolonları ekle
// Çalıştırmak için: node db/language-date-migration.cjs

const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_KuUAvq29xfwj@ep-wispy-bird-ag8pel3r-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require');

async function migrate() {
    console.log('Migration başlatılıyor...');

    try {
        // exam_date kolonu ekle
        await sql`ALTER TABLE student_languages ADD COLUMN IF NOT EXISTS exam_date DATE`;
        console.log('✅ exam_date kolonu eklendi');

        // expiry_date kolonu ekle
        await sql`ALTER TABLE student_languages ADD COLUMN IF NOT EXISTS expiry_date DATE`;
        console.log('✅ expiry_date kolonu eklendi');

        // is_expired kolonu ekle
        await sql`ALTER TABLE student_languages ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE`;
        console.log('✅ is_expired kolonu eklendi');

        // gemini_verified_score kolonu ekle
        await sql`ALTER TABLE student_languages ADD COLUMN IF NOT EXISTS gemini_verified_score VARCHAR(20)`;
        console.log('✅ gemini_verified_score kolonu eklendi');

        // student_skills tablosuna analiz durumu ekle
        await sql`ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS doc_verified BOOLEAN DEFAULT FALSE`;
        console.log('✅ student_skills.doc_verified kolonu eklendi');

        await sql`ALTER TABLE student_skills ADD COLUMN IF NOT EXISTS doc_type VARCHAR(50)`;
        console.log('✅ student_skills.doc_type kolonu eklendi');

        // student_references tablosuna analiz durumu ekle
        await sql`ALTER TABLE student_references ADD COLUMN IF NOT EXISTS doc_verified BOOLEAN DEFAULT FALSE`;
        console.log('✅ student_references.doc_verified kolonu eklendi');

        console.log('\n🎉 Migration başarıyla tamamlandı!');
    } catch (error) {
        console.error('❌ Migration hatası:', error.message);
        process.exit(1);
    }
}

migrate();

