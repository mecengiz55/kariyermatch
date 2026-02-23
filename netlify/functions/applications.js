import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/applications', '').replace('/api/applications', '');
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // POST /api/applications - Başvuru yap (öğrenci)
        if (event.httpMethod === 'POST' && (path === '' || path === '/')) {
            if (!authUser || authUser.role !== 'student') {
                return jsonResponse(403, { error: 'Sadece öğrenciler başvuru yapabilir' });
            }

            const { jobId, coverLetter } = body;
            if (!jobId) return jsonResponse(400, { error: 'İlan ID zorunludur' });

            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            // Eşleşme skoru hesapla
            const skills = await sql`SELECT * FROM student_skills WHERE student_id = ${profiles[0].id}`;
            const requirements = await sql`SELECT * FROM job_requirements WHERE job_id = ${jobId}`;

            let matchScore = 0;
            if (requirements.length > 0) {
                let totalScore = 0;
                let totalWeight = 0;
                for (const req of requirements) {
                    const w = req.is_required ? 2 : 1;
                    totalWeight += w;
                    const skill = skills.find(s => s.skill_name.toLowerCase() === req.skill_name.toLowerCase());
                    if (skill) {
                        totalScore += Math.min(skill.proficiency_level / (req.min_proficiency || 1), 1) * w;
                    }
                }
                matchScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
            }

            const result = await sql`
        INSERT INTO applications (job_id, student_id, match_score, cover_letter)
        VALUES (${jobId}, ${profiles[0].id}, ${matchScore}, ${coverLetter || null})
        ON CONFLICT (job_id, student_id) DO NOTHING
        RETURNING *
      `;

            if (result.length === 0) {
                return jsonResponse(409, { error: 'Bu ilana zaten başvurdunuz' });
            }

            return jsonResponse(201, { application: result[0] });
        }

        // GET /api/applications/my - Öğrencinin başvuruları
        if (event.httpMethod === 'GET' && path === '/my') {
            if (!authUser || authUser.role !== 'student') {
                return jsonResponse(403, { error: 'Yetkisiz' });
            }

            const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(200, { applications: [] });

            const applications = await sql`
        SELECT a.*, jl.title as job_title, jl.type as job_type, jl.location as job_location,
               ep.company_name, ep.logo_url
        FROM applications a
        JOIN job_listings jl ON a.job_id = jl.id
        JOIN employer_profiles ep ON jl.employer_id = ep.id
        WHERE a.student_id = ${profiles[0].id}
        ORDER BY a.applied_at DESC
      `;

            return jsonResponse(200, { applications });
        }

        // GET /api/applications/job/:jobId - İlana yapılan başvurular (işveren)
        if (event.httpMethod === 'GET' && path.match(/^\/job\/\d+$/)) {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Yetkisiz' });
            }

            const jobId = parseInt(path.split('/').pop());
            const employers = await sql`SELECT id FROM employer_profiles WHERE user_id = ${authUser.id}`;
            const jobs = await sql`SELECT id FROM job_listings WHERE id = ${jobId} AND employer_id = ${employers[0].id}`;
            if (jobs.length === 0) return jsonResponse(404, { error: 'İlan bulunamadı' });

            const applications = await sql`
        SELECT a.*, u.full_name, u.email, sp.university, sp.department, sp.city, sp.cv_url, sp.linkedin_url, sp.github_url
        FROM applications a
        JOIN student_profiles sp ON a.student_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE a.job_id = ${jobId}
        ORDER BY a.match_score DESC
      `;

            return jsonResponse(200, { applications });
        }

        // PUT /api/applications/:id/status - Başvuru durumu güncelle (işveren)
        if (event.httpMethod === 'PUT' && path.match(/^\/\d+\/status$/)) {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Yetkisiz' });
            }

            const appId = parseInt(path.split('/')[1]);
            const { status } = body;

            if (!['pending', 'reviewed', 'accepted', 'rejected'].includes(status)) {
                return jsonResponse(400, { error: 'Geçersiz durum' });
            }

            const result = await sql`
        UPDATE applications SET status = ${status}
        WHERE id = ${appId}
        RETURNING *
      `;

            return jsonResponse(200, { application: result[0] });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Applications error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
