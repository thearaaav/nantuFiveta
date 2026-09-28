/**
 * Memecah teks panjang menjadi beberapa bagian dengan batas panjang tertentu.
 * Memprioritaskan pemotongan pada paragraph (\n\n), baris baru (\n), atau spasi ( )
 * agar tidak memotong kata secara sembarangan.
 *
 * @param {string} text - Teks yang akan dipecah
 * @param {number} maxLength - Panjang maksimal setiap potongan (default: 1900)
 * @returns {string[]} - Array berisi potongan teks
 */
function splitMessage(text, maxLength = 1900) {
    if (!text || typeof text !== "string") {
        return [];
    }

    if (text.length <= maxLength) {
        return [text];
    }

    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        if (remaining.length <= maxLength) {
            chunks.push(remaining);
            break;
        }

        let splitIndex = -1;

        // Coba cari pemisah paragraf ganda (\n\n)
        const doubleNewline = remaining.lastIndexOf("\n\n", maxLength);
        if (doubleNewline !== -1 && doubleNewline > 0) {
            splitIndex = doubleNewline + 2;
        } else {
            // Coba cari pemisah baris baru (\n)
            const singleNewline = remaining.lastIndexOf("\n", maxLength);
            if (singleNewline !== -1 && singleNewline > 0) {
                splitIndex = singleNewline + 1;
            } else {
                // Coba cari pemisah spasi
                const space = remaining.lastIndexOf(" ", maxLength);
                if (space !== -1 && space > 0) {
                    splitIndex = space + 1;
                } else {
                    // Jika tidak ada pemisah kata sama sekali, potong tepat di maxLength
                    splitIndex = maxLength;
                }
            }
        }

        const chunk = remaining.slice(0, splitIndex);
        chunks.push(chunk);
        remaining = remaining.slice(splitIndex);
    }

    return chunks;
}

module.exports = {
    splitMessage
};
