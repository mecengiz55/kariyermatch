import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

// ── Helper: Bildirim oluştur (diğer fonksiyonlardan çağrılır) ──
export async function createNotification(sql, userId, type, title, message, link) {
    try {
        await sql`
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (${userId}, ${type}, ${title}, ${message || null}, ${link || null})
    `;
    } catch (e) {
        console.error('Notification create error:', e);
    }
}

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/notifications', '').replace('/api/notifications', '');

    if (!authUser) {
        return jsonResponse(401, { error: 'Giriş yapmanız gerekiyor' });
    }

    try {
        // GET /api/notifications - Kullanıcının bildirimlerini getir
        if (event.httpMethod === 'GET' && (path === '' || path === '/')) {
            const notifications = await sql`
        SELECT * FROM notifications
        WHERE user_id = ${authUser.id}
        ORDER BY created_at DESC
        LIMIT 50
      `;
            return jsonResponse(200, { notifications });
        }

        // GET /api/notifications/unread-count - Okunmamış bildirim sayısı
        if (event.httpMethod === 'GET' && path === '/unread-count') {
            const result = await sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ${authUser.id} AND is_read = false
      `;
            return jsonResponse(200, { count: parseInt(result[0].count) });
        }

        // PUT /api/notifications/read-all - Tümünü okundu yap
        if (event.httpMethod === 'PUT' && path === '/read-all') {
            await sql`
        UPDATE notifications SET is_read = true
        WHERE user_id = ${authUser.id} AND is_read = false
      `;
            return jsonResponse(200, { message: 'Tüm bildirimler okundu' });
        }

        // PUT /api/notifications/:id/read - Tek bildirimi okundu yap
        if (event.httpMethod === 'PUT' && path.match(/^\/\d+\/read$/)) {
            const notifId = parseInt(path.split('/')[1]);
            await sql`
        UPDATE notifications SET is_read = true
        WHERE id = ${notifId} AND user_id = ${authUser.id}
      `;
            return jsonResponse(200, { message: 'Bildirim okundu' });
        }

        // DELETE /api/notifications/:id - Bildirim sil
        if (event.httpMethod === 'DELETE' && path.match(/^\/\d+$/)) {
            const notifId = parseInt(path.slice(1));
            await sql`
        DELETE FROM notifications
        WHERE id = ${notifId} AND user_id = ${authUser.id}
      `;
            return jsonResponse(200, { message: 'Bildirim silindi' });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Notifications error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
