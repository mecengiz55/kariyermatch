import { getDb } from './utils/db.js';
import { generateToken, getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';
import bcrypt from 'bcryptjs';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '');
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // POST /api/auth/register
        if (event.httpMethod === 'POST' && path === '/register') {
            const { email, password, fullName, role } = body;

            if (!email || !password || !fullName || !role) {
                return jsonResponse(400, { error: 'Tüm alanlar zorunludur' });
            }

            if (!['student', 'employer'].includes(role)) {
                return jsonResponse(400, { error: 'Geçersiz rol' });
            }

            // Check if user exists
            const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
            if (existing.length > 0) {
                return jsonResponse(409, { error: 'Bu e-posta adresi zaten kayıtlı' });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const result = await sql`
        INSERT INTO users (email, password_hash, role, full_name)
        VALUES (${email}, ${passwordHash}, ${role}, ${fullName})
        RETURNING id, email, role, full_name
      `;

            const user = result[0];

            // Create profile based on role
            if (role === 'student') {
                await sql`INSERT INTO student_profiles (user_id) VALUES (${user.id})`;
            } else {
                await sql`INSERT INTO employer_profiles (user_id, company_name) VALUES (${user.id}, ${fullName})`;
            }

            const token = generateToken(user);
            return jsonResponse(201, {
                token,
                user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name }
            });
        }

        // POST /api/auth/login
        if (event.httpMethod === 'POST' && path === '/login') {
            const { email, password } = body;

            if (!email || !password) {
                return jsonResponse(400, { error: 'E-posta ve şifre zorunludur' });
            }

            const users = await sql`SELECT * FROM users WHERE email = ${email}`;
            if (users.length === 0) {
                return jsonResponse(401, { error: 'E-posta veya şifre hatalı' });
            }

            const user = users[0];
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return jsonResponse(401, { error: 'E-posta veya şifre hatalı' });
            }

            const token = generateToken(user);
            return jsonResponse(200, {
                token,
                user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name }
            });
        }

        // GET /api/auth/me
        if (event.httpMethod === 'GET' && path === '/me') {
            const authUser = getUserFromEvent(event);
            if (!authUser) {
                return jsonResponse(401, { error: 'Oturum gerekli' });
            }

            const users = await sql`
        SELECT id, email, role, full_name, created_at FROM users WHERE id = ${authUser.id}
      `;
            if (users.length === 0) {
                return jsonResponse(404, { error: 'Kullanıcı bulunamadı' });
            }

            const user = users[0];
            let profile = null;

            if (user.role === 'student') {
                const profiles = await sql`
          SELECT sp.*, array_agg(json_build_object('id', ss.id, 'skill_name', ss.skill_name, 'proficiency_level', ss.proficiency_level)) FILTER (WHERE ss.id IS NOT NULL) as skills
          FROM student_profiles sp
          LEFT JOIN student_skills ss ON sp.id = ss.student_id
          WHERE sp.user_id = ${user.id}
          GROUP BY sp.id
        `;
                profile = profiles[0] || null;
            } else {
                const profiles = await sql`
          SELECT * FROM employer_profiles WHERE user_id = ${user.id}
        `;
                profile = profiles[0] || null;
            }

            return jsonResponse(200, {
                user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name, createdAt: user.created_at },
                profile
            });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Auth error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
