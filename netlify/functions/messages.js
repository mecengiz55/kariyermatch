import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';
import { createNotification } from './notifications.js';

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/messages', '').replace('/api/messages', '');

    if (!authUser) {
        return jsonResponse(401, { error: 'Giriş yapmanız gerekiyor' });
    }

    try {
        // ── GET /api/messages/conversations ── Kullanıcının tüm konuşmaları
        if (event.httpMethod === 'GET' && (path === '/conversations' || path === '/conversations/')) {
            const conversations = await sql`
                SELECT c.*,
                    CASE WHEN c.user1_id = ${authUser.id} THEN u2.full_name ELSE u1.full_name END as other_name,
                    CASE WHEN c.user1_id = ${authUser.id} THEN u2.email ELSE u1.email END as other_email,
                    CASE WHEN c.user1_id = ${authUser.id} THEN u2.role ELSE u1.role END as other_role,
                    CASE WHEN c.user1_id = ${authUser.id} THEN c.user2_id ELSE c.user1_id END as other_user_id,
                    (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
                    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ${authUser.id} AND m.is_read = false) as unread_count
                FROM conversations c
                JOIN users u1 ON c.user1_id = u1.id
                JOIN users u2 ON c.user2_id = u2.id
                WHERE c.user1_id = ${authUser.id} OR c.user2_id = ${authUser.id}
                ORDER BY c.last_message_at DESC
            `;
            return jsonResponse(200, { conversations });
        }

        // ── GET /api/messages/unread-count ── Toplam okunmamış mesaj sayısı
        if (event.httpMethod === 'GET' && path === '/unread-count') {
            const result = await sql`
                SELECT COUNT(*) as count FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE (c.user1_id = ${authUser.id} OR c.user2_id = ${authUser.id})
                  AND m.sender_id != ${authUser.id}
                  AND m.is_read = false
            `;
            return jsonResponse(200, { count: parseInt(result[0].count) });
        }

        // ── GET /api/messages/conversations/:id ── Bir konuşmanın mesajları
        if (event.httpMethod === 'GET' && path.match(/^\/conversations\/\d+$/)) {
            const convId = parseInt(path.split('/')[2]);

            // Kullanıcının bu konuşmaya erişim hakki var mı kontrol et
            const conv = await sql`
                SELECT * FROM conversations
                WHERE id = ${convId} AND (user1_id = ${authUser.id} OR user2_id = ${authUser.id})
            `;
            if (conv.length === 0) {
                return jsonResponse(404, { error: 'Konuşma bulunamadı' });
            }

            const messages = await sql`
                SELECT m.*, u.full_name as sender_name
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = ${convId}
                ORDER BY m.created_at ASC
            `;

            // Karşı tarafın mesajlarını okundu yap
            await sql`
                UPDATE messages SET is_read = true
                WHERE conversation_id = ${convId}
                  AND sender_id != ${authUser.id}
                  AND is_read = false
            `;

            return jsonResponse(200, { messages, conversation: conv[0] });
        }

        // ── POST /api/messages/conversations ── Yeni konuşma başlat
        if (event.httpMethod === 'POST' && (path === '/conversations' || path === '/conversations/')) {
            const { receiverId } = JSON.parse(event.body || '{}');
            if (!receiverId) {
                return jsonResponse(400, { error: 'Alıcı belirtilmedi' });
            }

            if (parseInt(receiverId) === authUser.id) {
                return jsonResponse(400, { error: 'Kendinize mesaj gönderemezsiniz' });
            }

            // Mevcut konuşma var mı kontrol et (her iki yönde)
            const existing = await sql`
                SELECT * FROM conversations
                WHERE (user1_id = ${authUser.id} AND user2_id = ${receiverId})
                   OR (user1_id = ${receiverId} AND user2_id = ${authUser.id})
            `;

            if (existing.length > 0) {
                return jsonResponse(200, { conversation: existing[0], existing: true });
            }

            // Yeni konuşma oluştur (küçük ID user1, büyük ID user2)
            const u1 = Math.min(authUser.id, parseInt(receiverId));
            const u2 = Math.max(authUser.id, parseInt(receiverId));
            const result = await sql`
                INSERT INTO conversations (user1_id, user2_id)
                VALUES (${u1}, ${u2})
                RETURNING *
            `;

            return jsonResponse(201, { conversation: result[0] });
        }

        // ── POST /api/messages/send ── Mesaj gönder
        if (event.httpMethod === 'POST' && path === '/send') {
            const { conversationId, content } = JSON.parse(event.body || '{}');
            if (!conversationId || !content?.trim()) {
                return jsonResponse(400, { error: 'Konuşma ID ve mesaj içeriği gerekli' });
            }

            // Konuşmaya erişim kontrolü
            const conv = await sql`
                SELECT * FROM conversations
                WHERE id = ${conversationId} AND (user1_id = ${authUser.id} OR user2_id = ${authUser.id})
            `;
            if (conv.length === 0) {
                return jsonResponse(404, { error: 'Konuşma bulunamadı' });
            }

            // Mesajı kaydet
            const message = await sql`
                INSERT INTO messages (conversation_id, sender_id, content)
                VALUES (${conversationId}, ${authUser.id}, ${content.trim()})
                RETURNING *
            `;

            // Konuşmanın last_message_at güncelle
            await sql`
                UPDATE conversations SET last_message_at = NOW()
                WHERE id = ${conversationId}
            `;

            // Karşı tarafa bildirim gönder
            try {
                const receiverId = conv[0].user1_id === authUser.id ? conv[0].user2_id : conv[0].user1_id;
                const senderName = authUser.fullName || authUser.email.split('@')[0];
                await createNotification(
                    sql,
                    receiverId,
                    'new_message',
                    'Yeni Mesaj',
                    `${senderName}: ${content.trim().substring(0, 60)}${content.length > 60 ? '...' : ''}`,
                    '#/messages'
                );
            } catch (e) { console.error('Message notif error:', e); }

            return jsonResponse(201, { message: message[0] });
        }

        // ── PUT /api/messages/conversations/:id/read ── Mesajları okundu yap
        if (event.httpMethod === 'PUT' && path.match(/^\/conversations\/\d+\/read$/)) {
            const convId = parseInt(path.split('/')[2]);
            await sql`
                UPDATE messages SET is_read = true
                WHERE conversation_id = ${convId}
                  AND sender_id != ${authUser.id}
                  AND is_read = false
            `;
            return jsonResponse(200, { message: 'Mesajlar okundu' });
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Messages error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
