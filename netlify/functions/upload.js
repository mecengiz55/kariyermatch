// ── File Upload (Netlify Blobs) ──
import { getStore } from '@netlify/blobs';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const authUser = getUserFromEvent(event);
    if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

    const path = event.path.replace('/.netlify/functions/upload', '').replace('/api/upload', '');

    try {
        // POST /api/upload — PDF yükle
        if (event.httpMethod === 'POST' && (path === '' || path === '/')) {
            const contentType = event.headers['content-type'] || '';

            // Base64 encoded body ile çalışıyoruz (Netlify Functions multipart desteği)
            if (!event.body) {
                return jsonResponse(400, { error: 'Dosya bulunamadı' });
            }

            // Netlify Functions'da body JSON olarak gelecek (frontend base64 gönderecek)
            let fileData, fileName, fileMimeType;

            try {
                const body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body);
                fileData = body.fileData; // base64 encoded file content
                fileName = body.fileName || 'document.pdf';
                fileMimeType = body.mimeType || 'application/pdf';
            } catch (e) {
                return jsonResponse(400, { error: 'Geçersiz dosya verisi' });
            }

            if (!fileData) {
                return jsonResponse(400, { error: 'Dosya verisi boş' });
            }

            // MIME type kontrolü
            if (fileMimeType !== 'application/pdf') {
                return jsonResponse(400, { error: 'Sadece PDF dosyaları kabul edilir' });
            }

            // Base64 decode
            const buffer = Buffer.from(fileData, 'base64');

            // Boyut kontrolü
            if (buffer.length > MAX_FILE_SIZE) {
                return jsonResponse(400, { error: 'Dosya boyutu 5MB\'dan büyük olamaz' });
            }

            // Benzersiz key oluştur
            const key = `${authUser.id}_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

            // Netlify Blobs'a kaydet
            const store = getStore('documents');
            await store.set(key, buffer, {
                metadata: {
                    userId: String(authUser.id),
                    fileName: fileName,
                    mimeType: fileMimeType,
                    uploadedAt: new Date().toISOString()
                }
            });

            const fileUrl = `/.netlify/functions/upload/${key}`;

            return jsonResponse(200, {
                url: fileUrl,
                key: key,
                fileName: fileName
            });
        }

        // GET /api/upload/:key — Dosyayı getir
        if (event.httpMethod === 'GET' && path.length > 1) {
            const key = path.slice(1); // baştaki / kaldır

            const store = getStore('documents');

            try {
                const blob = await store.get(key, { type: 'arrayBuffer' });
                if (!blob) {
                    return jsonResponse(404, { error: 'Dosya bulunamadı' });
                }

                const metadata = await store.getMetadata(key);

                return {
                    statusCode: 200,
                    headers: {
                        ...corsHeaders(),
                        'Content-Type': metadata?.metadata?.mimeType || 'application/pdf',
                        'Content-Disposition': `inline; filename="${metadata?.metadata?.fileName || 'document.pdf'}"`,
                        'Cache-Control': 'public, max-age=31536000'
                    },
                    body: Buffer.from(blob).toString('base64'),
                    isBase64Encoded: true
                };
            } catch (e) {
                return jsonResponse(404, { error: 'Dosya bulunamadı' });
            }
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Upload error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası' });
    }
}
