import { v2 as cloudinary } from 'cloudinary';

// Cloudinary Yapılandırması
// Not: Normalde bunlar Netlify Environment Variables (Ortam Değişkenleri) içinde olmalı.
// Şimdilik doğrudan buraya ekliyoruz ancak ileride Netlify paneline taşınmalıdır.
cloudinary.config({
    cloud_name: 'dscinq9qn',
    api_key: '272142326855697',
    api_secret: 'f_Aa0nXD1ZArBUZ6sYivVNq9PhA'
});

/**
 * Base64 formatındaki dosyayı Cloudinary'ye yükler.
 * @param {string} base64Data - "data:application/pdf;base64,..." formatında veya sadece base64 string
 * @param {string} folder - Yüklenecek klasör (örn: 'kariyermatch/cvs')
 * @returns {Promise<Object>} Yükleme sonucu (url, public_id vb.)
 */
export async function uploadToCloudinary(base64Data, folder = 'kariyermatch') {
    try {
        // Veri zaten prefix içermiyorsa ekle (Cloudinary için gerekli)
        const dataUri = base64Data.startsWith('data:')
            ? base64Data
            : `data:application/pdf;base64,${base64Data}`;

        const result = await cloudinary.uploader.upload(dataUri, {
            folder: folder,
            resource_type: 'auto' // PDF vb. otomatik algıla
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
            fileName: result.original_filename
        };
    } catch (error) {
        console.error('Cloudinary Upload Error:', error);
        throw error;
    }
}

/**
 * Cloudinary'den dosya siler.
 * @param {string} publicId - Dosyanın public_id'si
 */
export async function deleteFromCloudinary(publicId) {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
    }
}
