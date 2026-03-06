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
        console.warn('GEMINI_API_KEY bulunamadı, analiz atlanıyor.');
        return { valid: true, documentType: 'unknown', date: null, score: null, reason: 'API key yok' };
    }

    // Belge tipine göre prompt oluştur
    const prompts = {
        certificate: `Bu belgeyi analiz et. Bu bir sertifika veya diploma belgesi mi?
Eğer sertifika/diploma ise:
- valid: true
- documentType: "certificate"
- date: belgedeki tarih (YYYY-MM-DD formatında, yoksa null)
- score: varsa not veya sonuç (string, yoksa null)
- reason: kısa açıklama

Eğer sertifika değilse:
- valid: false
- documentType: gerçek belge tipi (örn: "receipt", "photo", "other")
- date: null
- score: null
- reason: neden geçersiz olduğunu açıkla

Sadece JSON döndür, başka hiçbir şey yazma.`,

        language: `Bu belgeyi analiz et. Bu bir ${examType || 'dil sınavı'} sonuç belgesi mi?
Geçerli sınavlar: TOEFL, IELTS, YDS, YÖKDİL

Eğer dil sınavı sonuç belgesi ise:
- valid: true
- documentType: "language_certificate"
- date: sınav tarihi (YYYY-MM-DD formatında, bulamazsan sadece yılı yaz örn: "2022-01-01", yoksa null)
- score: sınav skoru (string, örn: "85", "6.5")
- reason: hangi sınav olduğunu belirt

Eğer dil sınavı belgesi değilse:
- valid: false
- documentType: gerçek belge tipi
- date: null
- score: null
- reason: neden geçersiz olduğunu açıkla

Sadece JSON döndür, başka hiçbir şey yazma.`,

        reference: `Bu belgeyi analiz et. Bu bir referans mektubu veya tavsiye mektubu mu?
Referans mektubu özellikleri: bir kişiyi veya çalışmasını tavsiye eden resmi yazı, genellikle imzalı.

Eğer referans mektubu ise:
- valid: true
- documentType: "reference_letter"
- date: mektup tarihi (YYYY-MM-DD formatında, yoksa null)
- score: null
- reason: kısa açıklama (kim yazmış varsa belirt)

Eğer referans mektubu değilse:
- valid: false
- documentType: gerçek belge tipi
- date: null
- score: null
- reason: neden geçersiz olduğunu açıkla

Sadece JSON döndür, başka hiçbir şey yazma.`
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
            // API hatası durumunda yüklemeye izin ver (kullanıcıyı engelleme)
            return { valid: true, documentType: 'unknown', date: null, score: null, reason: 'API hatası, analiz atlandı' };
        }

        const geminiData = await geminiResponse.json();
        const textContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
        // Hata durumunda yüklemeye izin ver, sadece log'la
        return { valid: true, documentType: 'unknown', date: null, score: null, reason: 'Analiz başarısız: ' + err.message };
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
