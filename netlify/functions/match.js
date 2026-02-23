import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/match', '').replace('/api/match', '');

    try {
        // GET /api/match/jobs - Öğrenci için uygun ilanları bul
        if (event.httpMethod === 'GET' && path === '/jobs') {
            if (!authUser || authUser.role !== 'student') {
                return jsonResponse(403, { error: 'Sadece öğrenciler kullanabilir' });
            }

            const profiles = await sql`SELECT * FROM student_profiles WHERE user_id = ${authUser.id}`;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            const studentProfile = profiles[0];
            const studentSkills = await sql`SELECT * FROM student_skills WHERE student_id = ${studentProfile.id}`;

            if (studentSkills.length === 0) {
                return jsonResponse(200, { matches: [], message: 'Beceri ekleyerek eşleşmeleri görün' });
            }

            // Tüm aktif ilanları getirir
            const jobs = await sql`
        SELECT jl.*, ep.company_name, ep.logo_url, ep.industry
        FROM job_listings jl
        JOIN employer_profiles ep ON jl.employer_id = ep.id
        WHERE jl.is_active = true
        ORDER BY jl.created_at DESC
      `;

            const matches = [];

            for (const job of jobs) {
                const requirements = await sql`SELECT * FROM job_requirements WHERE job_id = ${job.id}`;
                const score = calculateMatchScore(studentSkills, requirements, studentProfile, job);

                if (score > 0) {
                    matches.push({
                        ...job,
                        requirements,
                        matchScore: score,
                        matchedSkills: getMatchedSkills(studentSkills, requirements),
                        missingSkills: getMissingSkills(studentSkills, requirements)
                    });
                }
            }

            // Skora göre sırala
            matches.sort((a, b) => b.matchScore - a.matchScore);

            return jsonResponse(200, { matches });
        }

        // GET /api/match/candidates/:jobId - İşveren için uygun adayları bul
        if (event.httpMethod === 'GET' && path.match(/^\/candidates\/\d+$/)) {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Sadece işverenler kullanabilir' });
            }

            const jobId = parseInt(path.split('/').pop());

            // İlanın bu işverene ait olduğunu doğrula
            const employers = await sql`SELECT id FROM employer_profiles WHERE user_id = ${authUser.id}`;
            const jobs = await sql`SELECT * FROM job_listings WHERE id = ${jobId} AND employer_id = ${employers[0].id}`;
            if (jobs.length === 0) return jsonResponse(404, { error: 'İlan bulunamadı' });

            const requirements = await sql`SELECT * FROM job_requirements WHERE job_id = ${jobId}`;

            // Tüm öğrenci profillerini getir
            const students = await sql`
        SELECT sp.*, u.full_name, u.email
        FROM student_profiles sp
        JOIN users u ON sp.user_id = u.id
      `;

            const candidates = [];

            for (const student of students) {
                const skills = await sql`SELECT * FROM student_skills WHERE student_id = ${student.id}`;
                const score = calculateMatchScore(skills, requirements, student, jobs[0]);

                if (score > 20) {
                    // Check application status
                    const apps = await sql`
            SELECT * FROM applications WHERE job_id = ${jobId} AND student_id = ${student.id}
          `;

                    candidates.push({
                        ...student,
                        skills,
                        matchScore: score,
                        matchedSkills: getMatchedSkills(skills, requirements),
                        missingSkills: getMissingSkills(skills, requirements),
                        hasApplied: apps.length > 0,
                        applicationStatus: apps[0]?.status || null
                    });
                }
            }

            candidates.sort((a, b) => b.matchScore - a.matchScore);

            return jsonResponse(200, { candidates });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Match error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}

function calculateMatchScore(studentSkills, jobRequirements, studentProfile, job) {
    if (!jobRequirements || jobRequirements.length === 0) return 50;

    let totalScore = 0;
    let totalWeight = 0;

    // Beceri eşleşmesi (ana skor)
    for (const req of jobRequirements) {
        const weight = req.is_required ? 2 : 1;
        totalWeight += weight;

        const studentSkill = studentSkills.find(
            s => s.skill_name.toLowerCase().trim() === req.skill_name.toLowerCase().trim()
        );

        if (studentSkill) {
            const ratio = Math.min(studentSkill.proficiency_level / (req.min_proficiency || 1), 1);
            totalScore += ratio * weight;
        }
    }

    let baseScore = totalWeight > 0 ? (totalScore / totalWeight) * 80 : 0;

    // Bonus puanlar
    // Şehir eşleşmesi
    if (studentProfile.city && job.location &&
        studentProfile.city.toLowerCase().includes(job.location.toLowerCase().split(',')[0])) {
        baseScore += 5;
    }

    // Remote iş ise bonus
    if (job.is_remote) {
        baseScore += 3;
    }

    // GPA bonusu
    if (studentProfile.gpa && parseFloat(studentProfile.gpa) >= 3.0) {
        baseScore += 5;
    }

    // CV yüklenmişse bonus
    if (studentProfile.cv_url) {
        baseScore += 3;
    }

    // LinkedIn/GitHub varsa bonus
    if (studentProfile.linkedin_url) baseScore += 2;
    if (studentProfile.github_url) baseScore += 2;

    return Math.min(100, Math.round(baseScore));
}

function getMatchedSkills(studentSkills, requirements) {
    if (!requirements) return [];
    return requirements
        .filter(req => studentSkills.some(s => s.skill_name.toLowerCase().trim() === req.skill_name.toLowerCase().trim()))
        .map(req => req.skill_name);
}

function getMissingSkills(studentSkills, requirements) {
    if (!requirements) return [];
    return requirements
        .filter(req => req.is_required && !studentSkills.some(s => s.skill_name.toLowerCase().trim() === req.skill_name.toLowerCase().trim()))
        .map(req => req.skill_name);
}
