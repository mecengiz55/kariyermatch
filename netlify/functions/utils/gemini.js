// ── Gemini 1.5 Flash — PDF Belge Analizi ──
// Yüklenen PDF'leri analiz ederek belge tipini ve tarihini çıkarır.

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Cloudinary URL'sindeki PDF'i Gemini ile analiz eder.
 * @param {string} fileUrl - PDF'in public URL'i (Cloudinary)
 * @param {'certificate'|'reference'|'language'} expectedType - Beklenen belge tipi
 * @param {string} [examType] - Dil sınavı tipi (TOEFL, IELTS, YDS, YÖKDİL)
 * @returns {Promise<{valid: boolean, documentType: string, date: string|null, score: string|null, reason: string}>}
 */
export async function analyzeDocument(fileUrl, expectedType, examType = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // API key yoksa reddet — yanlış yapılandırma belge kabul ettirmemeli
        return { valid: false, documentType: 'unknown', date: null, score: null, reason: 'Belge doğrulama servisi yapılandırılmamış. Lütfen yönetici ile iletişime geçin.' };
    }


    // Belge tipine göre prompt oluştur
    const prompts = {
        certificate: `Analyze this document carefully. Is this a CERTIFICATE or DIPLOMA that proves completion of a course, training, or exam?

ACCEPTED documents (valid=true):
- Course completion certificates
- Training certificates  
- Professional certification documents
- Diplomas
- Achievement awards

REJECTED documents (valid=false):
- Class notes, lecture notes, study materials
- Homework or assignments
- Reports or essays
- Transcripts (grade reports)
- Attendance sheets
- Any document that is NOT explicitly issued as a certificate/diploma

Return ONLY this JSON, no other text:
{"valid": true/false, "documentType": "certificate" or describe what it actually is, "date": "YYYY-MM-DD or null", "score": "grade if any or null", "reason": "brief explanation in Turkish"}`,

        language: `Analyze this document. Is this an official ${examType || 'language exam'} result certificate (TOEFL, IELTS, YDS, or YÖKDİL)?

ACCEPTED (valid=true): Official score reports from TOEFL, IELTS, YDS, YÖKDİL exams only.
REJECTED (valid=false): Class notes, course materials, homework, any non-official document, certificates from other exams.

Return ONLY this JSON:
{"valid": true/false, "documentType": "language_certificate" or actual type, "date": "YYYY-MM-DD or null", "score": "exam score or null", "reason": "brief explanation in Turkish"}`,

        reference: `Analyze this document. Is this a REFERENCE LETTER or RECOMMENDATION LETTER written by someone to endorse a person's skills or character?

ACCEPTED (valid=true): Formal reference/recommendation letters, signed by an authority figure.
REJECTED (valid=false): Class notes, reports, certificates, transcripts, any document that is NOT a reference letter.

Return ONLY this JSON:
{"valid": true/false, "documentType": "reference_letter" or actual type, "date": "YYYY-MM-DD or null", "score": null, "reason": "brief explanation in Turkish"}`
    };

    const prompt = prompts[expectedType] || prompts.certificate;

    try {
        // PDF'i fetch et ve base64'e çevir
        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
            throw new Error('PDF indirilemedi: ' + pdfResponse.status);
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
        const mimeType = pdfResponse.headers.get('content-type') || 'application/pdf';

        // Gemini API isteği
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType.startsWith('image/') ? mimeType : 'application/pdf',
                                data: base64Pdf
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 500
                }
            })
        });

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error('Gemini API hatası:', errText);
            // API hatası: güvenli taraf -> reddet
            return { valid: false, documentType: 'unknown', date: null, score: null, reason: 'Belge doğrulama servisi geçici olarak kullanılamıyor. Lütfen tekrar deneyin.' };
        }

        const geminiData = await geminiResponse.json();
        const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('Gemini yanıtı:', textContent);

        // JSON parse et
        const cleanedText = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const result = JSON.parse(cleanedText);

        return {
            valid: result.valid === true,
            documentType: result.documentType || 'unknown',
            date: result.date || null,
            score: result.score || null,
            reason: result.reason || ''
        };

    } catch (err) {
        console.error('Gemini analiz hatası:', err.message);
        // Parse hatası vs. -> reddet (güvenli taraf)
        return { valid: false, documentType: 'unknown', date: null, score: null, reason: 'Belge okunamadı veya doğrulanamadı. Lütfen okunabilir bir PDF yükleyin.' };
    }
}

/**
 * Dil sertifikası geçerlilik süresi kontrolü.
 * @param {string} examType
 * @param {string} examDate - YYYY-MM-DD
 * @returns {{ expired: boolean, expiryDate: string, daysLeft: number }}
 */
export function checkLanguageCertExpiry(examType, examDate) {
    // Geçerlilik süreleri (yıl)
    const validityYears = {
        'TOEFL': 2,
        'IELTS': 2,
        'YDS': 5,
        'YÖKDİL': 5
    };

    const years = validityYears[examType] || 2;
    const examDateObj = new Date(examDate);
    const expiryDate = new Date(examDateObj);
    expiryDate.setFullYear(expiryDate.getFullYear() + years);

    const now = new Date();
    const daysLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    return {
        expired: now > expiryDate,
        expiryDate: expiryDate.toISOString().split('T')[0],
        daysLeft: daysLeft
    };
}
