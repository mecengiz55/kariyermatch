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
        // GET /api/students/profile - Kendi profilini getir
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
        SELECT * FROM student_skills WHERE student_id = ${profile.id} ORDER BY skill_name
      `;

            return jsonResponse(200, { profile: { ...profile, skills } });
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
        SELECT * FROM student_skills WHERE student_id = ${profile.id} ORDER BY skill_name
      `;

            return jsonResponse(200, { profile: { ...profile, skills } });
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

        // POST /api/students/skills - Beceri ekle
        if (event.httpMethod === 'POST' && path === '/skills') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const { skillName, proficiencyLevel } = body;
            if (!skillName) return jsonResponse(400, { error: 'Beceri adı zorunludur' });

            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const level = Math.min(5, Math.max(1, proficiencyLevel || 3));

            const result = await sql`
        INSERT INTO student_skills (student_id, skill_name, proficiency_level)
        VALUES (${profiles[0].id}, ${skillName}, ${level})
        ON CONFLICT (student_id, skill_name) DO UPDATE SET proficiency_level = ${level}
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

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Students error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
