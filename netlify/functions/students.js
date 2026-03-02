import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/students', '').replace('/api/students', '');
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // GET /api/students/profile - Kendi profilini getir (languages + references dahil)
        if (event.httpMethod === 'GET' && path === '/profile') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const profiles = await sql`
        SELECT sp.*, u.full_name, u.email
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.user_id = ${authUser.id}
      `;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const profile = profiles[0];
            const skills = await sql`
        SELECT ss.*, sr.reference_name, sr.institution as ref_institution
        FROM student_skills ss
        LEFT JOIN student_references sr ON ss.reference_id = sr.id
        WHERE ss.student_id = ${profile.id} ORDER BY ss.skill_name
      `;
            const languages = await sql`
        SELECT * FROM student_languages WHERE student_id = ${profile.id} ORDER BY exam_type
      `;
            const references = await sql`
        SELECT * FROM student_references WHERE student_id = ${profile.id} ORDER BY created_at DESC
      `;

            return jsonResponse(200, { profile: { ...profile, skills, languages, references } });
        }

        // GET /api/students/:id - Belirli öğrenci profili (işverenler için)
        if (event.httpMethod === 'GET' && path.match(/^\/\d+$/)) {
            const studentId = parseInt(path.slice(1));
            const profiles = await sql`
        SELECT sp.*, u.full_name, u.email
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.id = ${studentId}
      `;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const profile = profiles[0];
            const skills = await sql`
        SELECT ss.*, sr.reference_name, sr.institution as ref_institution
        FROM student_skills ss
        LEFT JOIN student_references sr ON ss.reference_id = sr.id
        WHERE ss.student_id = ${profile.id} ORDER BY ss.skill_name
      `;
            const languages = await sql`
        SELECT * FROM student_languages WHERE student_id = ${profile.id} ORDER BY exam_type
      `;
            const references = await sql`
        SELECT * FROM student_references WHERE student_id = ${profile.id} ORDER BY created_at DESC
      `;

            return jsonResponse(200, { profile: { ...profile, skills, languages, references } });
        }

        // PUT /api/students/profile - Profil güncelle
        if (event.httpMethod === 'PUT' && path === '/profile') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const { university, department, graduationYear, gpa, bio, cvUrl, linkedinUrl, githubUrl, phone, city } = body;

            const result = await sql`
        UPDATE student_profiles SET
          university = COALESCE(${university}, university),
          department = COALESCE(${department}, department),
          graduation_year = COALESCE(${graduationYear}, graduation_year),
          gpa = COALESCE(${gpa}, gpa),
          bio = COALESCE(${bio}, bio),
          cv_url = COALESCE(${cvUrl}, cv_url),
          linkedin_url = COALESCE(${linkedinUrl}, linkedin_url),
          github_url = COALESCE(${githubUrl}, github_url),
          phone = COALESCE(${phone}, phone),
          city = COALESCE(${city}, city),
          updated_at = NOW()
        WHERE user_id = ${authUser.id}
        RETURNING *
      `;

            if (result.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            // Kullanıcı adını da güncelle
            if (body.fullName) {
                await sql`UPDATE users SET full_name = ${body.fullName} WHERE id = ${authUser.id}`;
            }

            return jsonResponse(200, { profile: result[0] });
        }

        // ─── SKILLS (Sertifika/Referans doğrulamalı) ───

        // POST /api/students/skills - Beceri ekle
        if (event.httpMethod === 'POST' && path === '/skills') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const { skillName, proficiencyLevel, certificateUrl, verificationType, referenceId } = body;
            if (!skillName) return jsonResponse(400, { error: 'Beceri adı zorunludur' });

            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const level = Math.min(5, Math.max(1, proficiencyLevel || 3));
            const vType = verificationType || 'none';
            const certUrl = certificateUrl || null;
            const refId = referenceId || null;

            const result = await sql`
        INSERT INTO student_skills (student_id, skill_name, proficiency_level, certificate_url, verification_type, reference_id)
        VALUES (${profiles[0].id}, ${skillName}, ${level}, ${certUrl}, ${vType}, ${refId})
        ON CONFLICT (student_id, skill_name) DO UPDATE SET
          proficiency_level = ${level},
          certificate_url = ${certUrl},
          verification_type = ${vType},
          reference_id = ${refId}
        RETURNING *
      `;

            return jsonResponse(201, { skill: result[0] });
        }

        // DELETE /api/students/skills/:id - Beceri sil
        if (event.httpMethod === 'DELETE' && path.match(/^\/skills\/\d+$/)) {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const skillId = parseInt(path.split('/').pop());
            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            await sql`DELETE FROM student_skills WHERE id = ${skillId} AND student_id = ${profiles[0].id}`;
            return jsonResponse(200, { message: 'Beceri silindi' });
        }

        // ─── LANGUAGES (Dil Becerileri) ───

        // POST /api/students/languages - Dil skoru ekle
        if (event.httpMethod === 'POST' && path === '/languages') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const { examType, score, certificateUrl } = body;
            if (!examType || !score) return jsonResponse(400, { error: 'Sınav türü ve skor zorunludur' });
            if (!certificateUrl) return jsonResponse(400, { error: 'Sonuç belgesi (PDF) yüklenmesi zorunludur' });

            const validExams = ['TOEFL', 'IELTS', 'YDS', 'YÖKDİL'];
            if (!validExams.includes(examType)) return jsonResponse(400, { error: 'Geçersiz sınav türü' });

            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const result = await sql`
        INSERT INTO student_languages (student_id, exam_type, score, certificate_url)
        VALUES (${profiles[0].id}, ${examType}, ${score}, ${certificateUrl})
        ON CONFLICT (student_id, exam_type) DO UPDATE SET
          score = ${score},
          certificate_url = ${certificateUrl}
        RETURNING *
      `;

            return jsonResponse(201, { language: result[0] });
        }

        // DELETE /api/students/languages/:id - Dil skoru sil
        if (event.httpMethod === 'DELETE' && path.match(/^\/languages\/\d+$/)) {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const langId = parseInt(path.split('/').pop());
            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            await sql`DELETE FROM student_languages WHERE id = ${langId} AND student_id = ${profiles[0].id}`;
            return jsonResponse(200, { message: 'Dil skoru silindi' });
        }

        // ─── REFERENCES (Referans Mektupları) ───

        // POST /api/students/references - Referans ekle
        if (event.httpMethod === 'POST' && path === '/references') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const { referenceName, referenceTitle, institution, letterUrl, context } = body;
            if (!referenceName) return jsonResponse(400, { error: 'Referans veren kişi adı zorunludur' });
            if (!letterUrl) return jsonResponse(400, { error: 'Referans mektubu (PDF) yüklenmesi zorunludur' });

            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const ctx = context || 'academic';
            const result = await sql`
        INSERT INTO student_references (student_id, reference_name, reference_title, institution, letter_url, context)
        VALUES (${profiles[0].id}, ${referenceName}, ${referenceTitle || null}, ${institution || null}, ${letterUrl}, ${ctx})
        RETURNING *
      `;

            return jsonResponse(201, { reference: result[0] });
        }

        // DELETE /api/students/references/:id - Referans sil
        if (event.httpMethod === 'DELETE' && path.match(/^\/references\/\d+$/)) {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const refId = parseInt(path.split('/').pop());
            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            await sql`DELETE FROM student_references WHERE id = ${refId} AND student_id = ${profiles[0].id}`;
            return jsonResponse(200, { message: 'Referans silindi' });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Students error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
