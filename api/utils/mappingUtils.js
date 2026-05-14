/**
 * Finds the best match for a string within a list of allowed values (enums).
 * Performs case-insensitive matching and partial matching.
 * 
 * @param {string} input - The input string from the sheet.
 * @param {string[]} options - The list of allowed enum values.
 * @returns {string|null} - The best matching option or null if no good match.
 */
export const findBestMatch = (input, options) => {
    if (!input || !options || options.length === 0) return null;

    const normalizedInput = String(input).trim().toLowerCase();

    // 1. Exact match (case insensitive)
    const exactMatch = options.find(opt => opt.toLowerCase() === normalizedInput);
    if (exactMatch) return exactMatch;

    // 2. Partial match (if input is contained in option or vice versa)
    const partialMatch = options.find(opt => {
        const normalizedOpt = opt.toLowerCase();
        return normalizedOpt.includes(normalizedInput) || normalizedInput.includes(normalizedOpt);
    });
    if (partialMatch) return partialMatch;

    // 3. Related wording match (fuzzy-ish word based)
    const inputWords = normalizedInput.split(/[\s,._-]+/).filter(w => w.length > 2);
    for (const opt of options) {
        const normalizedOpt = opt.toLowerCase();
        for (const word of inputWords) {
            if (normalizedOpt.includes(word)) return opt;
        }
    }

    return null;
};
