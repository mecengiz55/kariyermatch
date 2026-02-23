import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/employers', '').replace('/api/employers', '');
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // GET /api/employers/profile
        if (event.httpMethod === 'GET' && path === '/profile') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const profiles = await sql`
        SELECT ep.*, u.full_name, u.email
        FROM employer_profiles ep
        JOIN users u ON ep.user_id = u.id
        WHERE ep.user_id = ${authUser.id}
      `;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            return jsonResponse(200, { profile: profiles[0] });
        }

        // GET /api/employers/:id
        if (event.httpMethod === 'GET' && path.match(/^\/\d+$/)) {
            const employerId = parseInt(path.slice(1));
            const profiles = await sql`
        SELECT ep.*, u.full_name
        FROM employer_profiles ep
        JOIN users u ON ep.user_id = u.id
        WHERE ep.id = ${employerId}
      `;
            if (profiles.length === 0) return jsonResponse(404, { error: 'Şirket bulunamadı' });

            return jsonResponse(200, { profile: profiles[0] });
        }

        // PUT /api/employers/profile
        if (event.httpMethod === 'PUT' && path === '/profile') {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            const { companyName, industry, companySize, website, description, logoUrl, city } = body;

            const result = await sql`
        UPDATE employer_profiles SET
          company_name = COALESCE(${companyName}, company_name),
          industry = COALESCE(${industry}, industry),
          company_size = COALESCE(${companySize}, company_size),
          website = COALESCE(${website}, website),
          description = COALESCE(${description}, description),
          logo_url = COALESCE(${logoUrl}, logo_url),
          city = COALESCE(${city}, city),
          updated_at = NOW()
        WHERE user_id = ${authUser.id}
        RETURNING *
      `;

            if (result.length === 0) return jsonResponse(404, { error: 'Profil bulunamadı' });

            if (body.fullName) {
                await sql`UPDATE users SET full_name = ${body.fullName} WHERE id = ${authUser.id}`;
            }

            return jsonResponse(200, { profile: result[0] });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Employers error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
