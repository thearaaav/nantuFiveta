const { GoogleGenAI } = require("@google/genai");

let aiClient = null;

function getClient() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY belum dikonfigurasi di .env");
    }

    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey });
    }

    return aiClient;
}

/**
 * Mengirimkan prompt pertanyaan ke model Gemini AI dan mengembalikan teks respon.
 *
 * @param {string} prompt - Pertanyaan atau instruksi dari pengguna
 * @returns {Promise<string>} - Jawaban teks dari Gemini AI
 */
async function generateAIResponse(prompt) {
    try {
        const ai = getClient();

        // Menggunakan model Free Tier resmi Gemini
        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        if (!response || !response.text) {
            throw new Error("Tidak ada respon teks yang diterima dari Gemini.");
        }

        return response.text;
    } catch (error) {
        // Log pesan error secara aman ke console server tanpa membocorkan API key
        console.error("❌ Error: ", error?.message || "Unknown error");
        throw error;
    }
}

module.exports = {
    generateAIResponse
};
