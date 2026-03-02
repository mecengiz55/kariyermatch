// ── Candidate Search API ──
import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/search', '').replace('/api/search', '');

    try {
        // POST /api/search/candidates - Çoklu filtre ile aday ara
        if (event.httpMethod === 'POST' && path === '/candidates') {
            if (!authUser || authUser.role !== 'employer') {
                return jsonResponse(403, { error: 'Sadece işverenler kullanabilir' });
            }

            const body = event.body ? JSON.parse(event.body) : {};
            const { skills, languages, city, university, minGpa, department } = body;

            // Tüm öğrenci profillerini al
            let students = await sql`
                SELECT sp.*, u.full_name, u.email
                FROM student_profiles sp
                JOIN users u ON sp.user_id = u.id
            `;

            // Basit filtreler
            if (city) {
                students = students.filter(s =>
                    s.city && s.city.toLowerCase().includes(city.toLowerCase())
                );
            }
            if (university) {
                students = students.filter(s =>
                    s.university && s.university.toLowerCase().includes(university.toLowerCase())
                );
            }
            if (department) {
                students = students.filter(s =>
                    s.department && s.department.toLowerCase().includes(department.toLowerCase())
                );
            }
            if (minGpa) {
                students = students.filter(s =>
                    s.gpa && parseFloat(s.gpa) >= parseFloat(minGpa)
                );
            }

            // Her öğrenci için detayları getir
            const results = [];
            for (const student of students) {
                const studentSkills = await sql`
                    SELECT ss.*, sr.reference_name, sr.institution as ref_institution
                    FROM student_skills ss
                    LEFT JOIN student_references sr ON ss.reference_id = sr.id
                    WHERE ss.student_id = ${student.id}
                `;
                const studentLangs = await sql`
                    SELECT * FROM student_languages WHERE student_id = ${student.id}
                `;
                const studentRefs = await sql`
                    SELECT * FROM student_references WHERE student_id = ${student.id}
                `;

                // Beceri filtresi
                if (skills && skills.length > 0) {
                    const studentSkillNames = studentSkills.map(s => s.skill_name.toLowerCase().trim());
                    const hasAnySkill = skills.some(s => studentSkillNames.includes(s.toLowerCase().trim()));
                    if (!hasAnySkill) continue;
                }

                // Dil filtresi
                if (languages && languages.length > 0) {
                    let langMatch = true;
                    for (const langFilter of languages) {
                        const found = studentLangs.find(l =>
                            l.exam_type === langFilter.exam &&
                            parseFloat(l.score) >= parseFloat(langFilter.minScore || 0)
                        );
                        if (!found) { langMatch = false; break; }
                    }
                    if (!langMatch) continue;
                }

                // Profil tamamlanma skoru
                const completionScore = calculateProfileCompletion(student, studentSkills, studentLangs, studentRefs);

                results.push({
                    ...student,
                    skills: studentSkills,
                    languages: studentLangs,
                    references: studentRefs,
                    profileCompletion: completionScore,
                    // Eşleşen beceriler
                    matchedSkills: skills ? skills.filter(s =>
                        studentSkills.some(ss => ss.skill_name.toLowerCase().trim() === s.toLowerCase().trim())
                    ) : []
                });
            }

            // Profil tamamlanma oranına göre sırala (tam dolu profiller önce)
            results.sort((a, b) => b.profileCompletion - a.profileCompletion);

            return jsonResponse(200, { candidates: results, total: results.length });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Search error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}

function calculateProfileCompletion(profile, skills, languages, references) {
    let score = 0;
    const maxScore = 100;

    // Temel bilgiler (30 puan)
    if (profile.university) score += 5;
    if (profile.department) score += 5;
    if (profile.graduation_year) score += 3;
    if (profile.gpa) score += 5;
    if (profile.bio) score += 4;
    if (profile.city) score += 3;
    if (profile.phone) score += 3;
    if (profile.cv_url) score += 2;

    // Beceriler (30 puan)
    const skillCount = skills.length;
    score += Math.min(15, skillCount * 3);
    // Sertifikalı beceriler bonus
    const certifiedSkills = skills.filter(s => s.verification_type === 'certificate' || s.verification_type === 'reference');
    score += Math.min(15, certifiedSkills.length * 5);

    // Dil becerileri (20 puan)
    score += Math.min(20, languages.length * 10);

    // Referanslar (20 puan)
    score += Math.min(20, references.length * 7);

    return Math.min(maxScore, score);
}
