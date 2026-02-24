import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';
import { createNotification } from './notifications.js';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/jobs', '').replace('/api/jobs', '');
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // GET /api/jobs - Tüm aktif ilanları listele
        if (event.httpMethod === 'GET' && (path === '' || path === '/')) {
            const params = event.queryStringParameters || {};
            const type = params.type;
            const search = params.search;
            const location = params.location;
            const page = parseInt(params.page) || 1;
            const limit = parseInt(params.limit) || 12;
            const offset = (page - 1) * limit;

            let query = `
        SELECT jl.*, ep.company_name, ep.logo_url, ep.industry,
          (SELECT json_agg(json_build_object('skill_name', jr.skill_name, 'min_proficiency', jr.min_proficiency, 'is_required', jr.is_required))
           FROM job_requirements jr WHERE jr.job_id = jl.id) as requirements
        FROM job_listings jl
        JOIN employer_profiles ep ON jl.employer_id = ep.id
        WHERE jl.is_active = true
      `;
            const conditions = [];
            const values = [];

            if (type && type !== 'all') {
                values.push(type);
                conditions.push(`jl.type = $${values.length}`);
            }
            if (location) {
                values.push(`%${location}%`);
                conditions.push(`jl.location ILIKE $${values.length}`);
            }
            if (search) {
                values.push(`%${search}%`);
                conditions.push(`(jl.title ILIKE $${values.length} OR jl.description ILIKE $${values.length})`);
            }

            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }
            query += ' ORDER BY jl.created_at DESC';
            values.push(limit);
            query += ` LIMIT $${values.length}`;
            values.push(offset);
            query += ` OFFSET $${values.length}`;

            // Use tagged template for simple queries, raw for dynamic
            const jobs = await sql.query(query, values);

            // Count total
            let countQuery = `SELECT COUNT(*) as total FROM job_listings jl WHERE jl.is_active = true`;
            const countVals = [];
            if (type && type !== 'all') {
                countVals.push(type);
                countQuery += ` AND jl.type = $${countVals.length}`;
            }
            if (location) {
                countVals.push(`%${location}%`);
                countQuery += ` AND jl.location ILIKE $${countVals.length}`;
            }
            if (search) {
                countVals.push(`%${search}%`);
                countQuery += ` AND (jl.title ILIKE $${countVals.length} OR jl.description ILIKE $${countVals.length})`;
            }
            const countResult = await sql.query(countQuery, countVals);

            return jsonResponse(200, {
                jobs: jobs.rows || jobs,
                total: parseInt((countResult.rows || countResult)[0]?.total || 0),
                page,
                limit
            });
        }

        // GET /api/jobs/:id - İlan detayı
        if (event.httpMethod === 'GET' && path.match(/^\/\d+$/)) {
            const jobId = parseInt(path.slice(1));
            const jobs = await sql`
        SELECT jl.*, ep.company_name, ep.logo_url, ep.industry, ep.city as company_city, ep.website, ep.description as company_description
        FROM job_listings jl
        JOIN employer_profiles ep ON jl.employer_id = ep.id
        WHERE jl.id = ${jobId}
      `;
            if (jobs.length === 0) return jsonResponse(404, { error: 'İlan bulunamadı' });

            const requirements = await sql`
        SELECT * FROM job_requirements WHERE job_id = ${jobId}
      `;

            const job = { ...jobs[0], requirements };

            // Eğer giriş yapmış öğrenciyse eşleşme skorunu hesapla
            if (authUser && authUser.role === 'student') {
                const profiles = await sql`SELECT id FROM student_profiles WHERE user_id = ${authUser.id}`;
                if (profiles.length > 0) {
                    const skills = await sql`SELECT * FROM student_skills WHERE student_id = ${profiles[0].id}`;
                    job.matchScore = calculateMatchScore(skills, requirements);

                    // Başvuru durumunu kontrol et
                    const apps = await sql`
            SELECT * FROM applications WHERE job_id = ${jobId} AND student_id = ${profiles[0].id}
          `;
                    job.hasApplied = apps.length > 0;
                    job.applicationStatus = apps[0]?.status || null;
                }
            }

            return jsonResponse(200, { job });
        }

        // POST /api/jobs - Yeni ilan oluştur (sadece işverenler)
        if (event.httpMethod === 'POST' && (path === '' || path === '/')) {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Sadece işverenler ilan oluşturabilir' });
            }

            const employers = await sql`SELECT id FROM employer_profiles WHERE user_id = ${authUser.id}`;
            if (employers.length === 0) return jsonResponse(404, { error: 'İşveren profili bulunamadı' });

            const { title, description, type, location, isRemote, salaryMin, salaryMax, deadline, requirements } = body;

            if (!title || !description) {
                return jsonResponse(400, { error: 'Başlık ve açıklama zorunludur' });
            }

            const result = await sql`
        INSERT INTO job_listings (employer_id, title, description, type, location, is_remote, salary_min, salary_max, deadline)
        VALUES (${employers[0].id}, ${title}, ${description}, ${type || 'job'}, ${location}, ${isRemote || false}, ${salaryMin || null}, ${salaryMax || null}, ${deadline || null})
        RETURNING *
      `;

            const jobId = result[0].id;

            // Gereksinimleri ekle
            if (requirements && Array.isArray(requirements)) {
                for (const req of requirements) {
                    await sql`
            INSERT INTO job_requirements (job_id, skill_name, min_proficiency, is_required)
            VALUES (${jobId}, ${req.skillName}, ${req.minProficiency || 1}, ${req.isRequired !== false})
          `;
                }
            }

            // Tüm öğrencilere bildirim gönder
            try {
                const students = await sql`SELECT id FROM users WHERE role = 'student'`;
                for (const student of students) {
                    await createNotification(
                        sql,
                        student.id,
                        'new_job',
                        'Yeni İlan',
                        `Yeni ilan yayınlandı: "${title}"`,
                        `#/jobs/${jobId}`
                    );
                }
            } catch (e) { console.error('Notif error:', e); }

            return jsonResponse(201, { job: result[0] });
        }

        // PUT /api/jobs/:id - İlan güncelle
        if (event.httpMethod === 'PUT' && path.match(/^\/\d+$/)) {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Yetkisiz' });
            }

            const jobId = parseInt(path.slice(1));
            const employers = await sql`SELECT id FROM employer_profiles WHERE user_id = ${authUser.id}`;

            const { title, description, type, location, isRemote, salaryMin, salaryMax, deadline, isActive, requirements } = body;

            const result = await sql`
        UPDATE job_listings SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          type = COALESCE(${type}, type),
          location = COALESCE(${location}, location),
          is_remote = COALESCE(${isRemote}, is_remote),
          salary_min = COALESCE(${salaryMin}, salary_min),
          salary_max = COALESCE(${salaryMax}, salary_max),
          deadline = COALESCE(${deadline}, deadline),
          is_active = COALESCE(${isActive}, is_active),
          updated_at = NOW()
        WHERE id = ${jobId} AND employer_id = ${employers[0].id}
        RETURNING *
      `;

            if (result.length === 0) return jsonResponse(404, { error: 'İlan bulunamadı' });

            // Gereksinimleri güncelle
            if (requirements && Array.isArray(requirements)) {
                await sql`DELETE FROM job_requirements WHERE job_id = ${jobId}`;
                for (const req of requirements) {
                    await sql`
            INSERT INTO job_requirements (job_id, skill_name, min_proficiency, is_required)
            VALUES (${jobId}, ${req.skillName}, ${req.minProficiency || 1}, ${req.isRequired !== false})
          `;
                }
            }

            return jsonResponse(200, { job: result[0] });
        }

        // DELETE /api/jobs/:id
        if (event.httpMethod === 'DELETE' && path.match(/^\/\d+$/)) {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Yetkisiz' });
            }

            const jobId = parseInt(path.slice(1));
            const employers = await sql`SELECT id FROM employer_profiles WHERE user_id = ${authUser.id}`;

            await sql`DELETE FROM job_listings WHERE id = ${jobId} AND employer_id = ${employers[0].id}`;
            return jsonResponse(200, { message: 'İlan silindi' });
        }

        // GET /api/jobs/my - İşverenin kendi ilanları
        if (event.httpMethod === 'GET' && path === '/my') {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Yetkisiz' });
            }

            const employers = await sql`SELECT id FROM employer_profiles WHERE user_id = ${authUser.id}`;
            if (employers.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const jobs = await sql`
        SELECT jl.*,
          (SELECT COUNT(*) FROM applications WHERE job_id = jl.id) as application_count
        FROM job_listings jl
        WHERE jl.employer_id = ${employers[0].id}
        ORDER BY jl.created_at DESC
      `;

            return jsonResponse(200, { jobs });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Jobs error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}

function calculateMatchScore(studentSkills, jobRequirements) {
    if (!jobRequirements || jobRequirements.length === 0) return 100;

    let totalScore = 0;
    let totalWeight = 0;

    for (const req of jobRequirements) {
        const weight = req.is_required ? 2 : 1;
        totalWeight += weight;

        const studentSkill = studentSkills.find(
            s => s.skill_name.toLowerCase() === req.skill_name.toLowerCase()
        );

        if (studentSkill) {
            const ratio = Math.min(studentSkill.proficiency_level / (req.min_proficiency || 1), 1);
            totalScore += ratio * weight;
        }
    }

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
}
