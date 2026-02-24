// ── Admin API ──
import { neon } from '@neondatabase/serverless';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

const sql = neon(process.env.DATABASE_URL);

function isAdmin(user) {
    return user && user.role === 'admin';
}

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders(), body: '' };
    }

    const user = getUserFromEvent(event);
    if (!isAdmin(user)) {
        return jsonResponse(403, { error: 'Yetkiniz yok' });
    }

    const path = event.path.replace('/.netlify/functions/admin', '');
    const method = event.httpMethod;

    try {
        // ── Dashboard Stats ──
        if (path === '/stats' && method === 'GET') {
            const users = await sql`SELECT COUNT(*) as count FROM users`;
            const students = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'student'`;
            const employers = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'employer'`;
            const jobs = await sql`SELECT COUNT(*) as count FROM job_listings`;
            const activeJobs = await sql`SELECT COUNT(*) as count FROM job_listings WHERE is_active = true`;
            const applications = await sql`SELECT COUNT(*) as count FROM applications`;

            return jsonResponse(200, {
                totalUsers: parseInt(users[0].count),
                totalStudents: parseInt(students[0].count),
                totalEmployers: parseInt(employers[0].count),
                totalJobs: parseInt(jobs[0].count),
                activeJobs: parseInt(activeJobs[0].count),
                totalApplications: parseInt(applications[0].count)
            });
        }

        // ── List All Users ──
        if (path === '/users' && method === 'GET') {
            const result = await sql`
        SELECT u.id, u.email, u.role, u.full_name, u.created_at,
          sp.university, sp.department, sp.city as student_city,
          ep.company_name, ep.industry, ep.city as employer_city
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN employer_profiles ep ON u.id = ep.user_id
        ORDER BY u.created_at DESC
      `;
            return jsonResponse(200, { users: result });
        }

        // ── Delete User ──
        if (path.match(/^\/users\/\d+$/) && method === 'DELETE') {
            const userId = path.split('/')[2];
            if (parseInt(userId) === user.id) {
                return jsonResponse(400, { error: 'Kendinizi silemezsiniz' });
            }
            await sql`DELETE FROM users WHERE id = ${userId}`;
            return jsonResponse(200, { message: 'Kullanıcı silindi' });
        }

        // ── Update User Role ──
        if (path.match(/^\/users\/\d+\/role$/) && method === 'PUT') {
            const userId = path.split('/')[2];
            const { role } = JSON.parse(event.body);
            await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`;
            return jsonResponse(200, { message: 'Rol güncellendi' });
        }

        // ── List All Jobs ──
        if (path === '/jobs' && method === 'GET') {
            const result = await sql`
        SELECT jl.*, ep.company_name,
          (SELECT COUNT(*) FROM applications a WHERE a.job_id = jl.id) as application_count
        FROM job_listings jl
        LEFT JOIN employer_profiles ep ON jl.employer_id = ep.id
        ORDER BY jl.created_at DESC
      `;
            return jsonResponse(200, { jobs: result });
        }

        // ── Admin Create Job (without employer account) ──
        if (path === '/jobs' && method === 'POST') {
            const { title, description, type, location, isRemote, salaryMin, salaryMax, deadline, companyName, companyWebsite, requirements } = JSON.parse(event.body);
            if (!title || !description) {
                return jsonResponse(400, { error: 'Başlık ve açıklama zorunlu' });
            }

            const fullDescription = companyName
                ? `🏢 ${companyName}${companyWebsite ? ' | ' + companyWebsite : ''}\n\n${description}`
                : description;

            const result = await sql`
        INSERT INTO job_listings (employer_id, title, description, type, location, is_remote, salary_min, salary_max, deadline)
        VALUES (null, ${title}, ${fullDescription}, ${type || 'job'}, ${location || null}, ${isRemote || false}, ${salaryMin || null}, ${salaryMax || null}, ${deadline || null})
        RETURNING id
      `;
            const jobId = result[0].id;

            if (requirements && requirements.length > 0) {
                for (const req of requirements) {
                    await sql`
            INSERT INTO job_requirements (job_id, skill_name, min_proficiency, is_required)
            VALUES (${jobId}, ${req.skillName}, ${req.minProficiency || 1}, ${req.isRequired !== false})
          `;
                }
            }
            return jsonResponse(201, { message: 'İlan oluşturuldu', jobId });
        }

        // ── Delete Job ──
        if (path.match(/^\/jobs\/\d+$/) && method === 'DELETE') {
            const jobId = path.split('/')[2];
            await sql`DELETE FROM job_listings WHERE id = ${jobId}`;
            return jsonResponse(200, { message: 'İlan silindi' });
        }

        // ── Toggle Job Active ──
        if (path.match(/^\/jobs\/\d+\/toggle$/) && method === 'PUT') {
            const jobId = path.split('/')[2];
            await sql`UPDATE job_listings SET is_active = NOT is_active WHERE id = ${jobId}`;
            return jsonResponse(200, { message: 'İlan durumu güncellendi' });
        }

        // ── Admin Edit Job ──
        if (path.match(/^\/jobs\/\d+\/edit$/) && method === 'PUT') {
            const jobId = path.split('/')[2];
            const { title, description, type, location, isRemote, salaryMin, salaryMax, deadline } = JSON.parse(event.body);
            await sql`
        UPDATE job_listings SET
          title = COALESCE(${title}, title),
          description = COALESCE(${description}, description),
          type = COALESCE(${type}, type),
          location = COALESCE(${location}, location),
          is_remote = COALESCE(${isRemote}, is_remote),
          salary_min = ${salaryMin || null},
          salary_max = ${salaryMax || null},
          deadline = ${deadline || null},
          updated_at = NOW()
        WHERE id = ${jobId}
      `;
            return jsonResponse(200, { message: 'İlan güncellendi' });
        }

        // ── List All Applications ──
        if (path === '/applications' && method === 'GET') {
            const result = await sql`
        SELECT a.*, jl.title as job_title, u.full_name as student_name, u.email as student_email,
          ep.company_name
        FROM applications a
        JOIN job_listings jl ON a.job_id = jl.id
        JOIN student_profiles sp ON a.student_id = sp.id
        JOIN users u ON sp.user_id = u.id
        LEFT JOIN employer_profiles ep ON jl.employer_id = ep.id
        ORDER BY a.applied_at DESC
      `;
            return jsonResponse(200, { applications: result });
        }

        // ── Site Settings - Get ──
        if (path === '/settings' && method === 'GET') {
            const result = await sql`SELECT setting_key, setting_value FROM site_settings`;
            const settings = {};
            result.forEach(r => { settings[r.setting_key] = r.setting_value; });
            return jsonResponse(200, { settings });
        }

        // ── Site Settings - Update ──
        if (path === '/settings' && method === 'PUT') {
            const { settings } = JSON.parse(event.body);
            for (const [key, value] of Object.entries(settings)) {
                await sql`
          INSERT INTO site_settings (setting_key, setting_value, updated_at)
          VALUES (${key}, ${value}, NOW())
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = ${value}, updated_at = NOW()
        `;
            }
            return jsonResponse(200, { message: 'Ayarlar güncellendi' });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Admin API error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası: ' + error.message });
    }
}
