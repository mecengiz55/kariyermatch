// ── File Upload (Cloudinary-based) ──
import { getDb } from './utils/db.js';
import { getUserFromEvent, jsonResponse, corsHeaders } from './utils/helpers.js';
import { uploadToCloudinary } from './utils/cloudinary.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Cloudinary ile 10MB'a çıkarabiliriz

export async function handler(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders() };
    }

    const sql = getDb();
    const authUser = getUserFromEvent(event);
    const path = event.path.replace('/.netlify/functions/upload', '').replace('/api/upload', '');

    try {
        // POST /api/upload — PDF yükle
        if (event.httpMethod === 'POST' && (path === '' || path === '/')) {
            if (!authUser) return jsonResponse(401, { error: 'Oturum gerekli' });

            if (!event.body) {
                return jsonResponse(400, { error: 'Dosya bulunamadı' });
            }

            let fileData, fileName, fileMimeType;

            try {
                const body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body);
                fileData = body.fileData;
                fileName = body.fileName || 'document.pdf';
                fileMimeType = body.mimeType || 'application/pdf';
            } catch (e) {
                return jsonResponse(400, { error: 'Geçersiz dosya verisi' });
            }

            if (!fileData) {
                return jsonResponse(400, { error: 'Dosya verisi boş' });
            }

            if (fileMimeType !== 'application/pdf' && !fileMimeType.startsWith('image/')) {
                return jsonResponse(400, { error: 'Sadece PDF veya Resim dosyaları kabul edilir' });
            }

            // Cloudinary'ye yükle
            let uploadResult;
            try {
                uploadResult = await uploadToCloudinary(fileData, `kariyermatch/user_${authUser.id}`);
            } catch (err) {
                return jsonResponse(500, { error: 'Bulut depolama hatası: ' + err.message });
            }

            // PostgreSQL'e kaydet (Artık veri değil, URL ve Public ID kaydediyoruz)
            const key = uploadResult.publicId;
            const fileUrl = uploadResult.url;

            await sql`
                INSERT INTO uploaded_files (file_key, user_id, file_name, mime_type, file_data)
                VALUES (${key}, ${authUser.id}, ${fileName}, ${fileMimeType}, ${fileUrl})
            `;

            return jsonResponse(200, {
                url: fileUrl,
                key: key,
                fileName: fileName
            });
        }

        // GET /api/upload/:key — Dosya bilgilerini veya linkini getir
        if (event.httpMethod === 'GET' && path.length > 1) {
            const key = path.slice(1);

            const rows = await sql`
                SELECT file_name, mime_type, file_data FROM uploaded_files WHERE file_key = ${key}
            `;

            if (rows.length === 0) {
                return jsonResponse(404, { error: 'Dosya bulunamadı' });
            }

            const file = rows[0];

            // Eğer dosya verisi bir URL ise (http ile başlıyorsa), yönlendir
            if (file.file_data.startsWith('http')) {
                return {
                    statusCode: 302,
                    headers: {
                        ...corsHeaders(),
                        'Location': file.file_data
                    }
                };
            }

            // Eski Base64 veriler için geriye dönük uyumluluk
            return {
                statusCode: 200,
                headers: {
                    ...corsHeaders(),
                    'Content-Type': file.mime_type || 'application/pdf',
                    'Content-Disposition': `inline; filename="${file.file_name || 'document.pdf'}"`,
                    'Cache-Control': 'public, max-age=31536000'
                },
                body: file.file_data,
                isBase64Encoded: true
            };
        }

        return jsonResponse(404, { error: 'Endpoint bulunamadı' });
    } catch (error) {
        console.error('Upload error:', error);
        return jsonResponse(500, { error: 'Sunucu hatası: ' + error.message });
    }
}

