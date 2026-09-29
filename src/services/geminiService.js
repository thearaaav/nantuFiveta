/**
 * Service untuk memanggil OpenRouter AI (menggantikan Google Gemini SDK langsung).
 * Mendukung berbagai model AI via API https://openrouter.ai/api/v1/chat/completions.
 */

function getApiKey() {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY belum dikonfigurasi di file .env");
    }

    return apiKey;
}

/**
 * Mengirimkan prompt pertanyaan ke model OpenRouter AI dan mengembalikan teks respon.
 *
 * @param {string} prompt - Pertanyaan atau instruksi dari pengguna
 * @returns {Promise<string>} - Jawaban teks dari AI
 */
async function generateAIResponse(prompt) {
    try {
        const apiKey = getApiKey();
        const model = process.env.OPENROUTER_MODEL || "google/gemini-3.6-flash";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/thearaaav/nantuFiveta",
                "X-Title": "nantuFive Discord Bot"
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 1500,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
            throw new Error(`OpenRouter Error: ${errMsg}`);
        }

        const data = await response.json();
        const replyText = data?.choices?.[0]?.message?.content;

        if (!replyText) {
            throw new Error("Tidak ada respon teks yang diterima dari model OpenRouter.");
        }

        return replyText.trim();
    } catch (error) {
        // Log pesan error secara aman ke console server tanpa membocorkan API key
        console.error("❌ Error OpenRouter AI:", error?.message || "Unknown error");
        throw error;
    }
}

module.exports = {
    generateAIResponse
};
