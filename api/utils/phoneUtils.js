// Standard country prefixes for matching
export const COMMON_PREFIXES = ['91', '971', '966', '974', '965', '968', '973', '20', '962', '961', '964', '963', '967', '970', '972', '98', '90', '1', '44'];

export const parsePhoneNumber = (fullPhone) => {
    if (!fullPhone) return { countryCode: '', localNumber: '' };

    // If it doesn't start with +, return as local number
    if (!fullPhone.startsWith('+')) {
        return { countryCode: '', localNumber: fullPhone.replace(/\D/g, '') };
    }

    const digits = fullPhone.replace(/\D/g, '');
    
    // Sort prefixes by length descending to match longer ones first (e.g. +971 vs +9)
    const sortedPrefixes = [...COMMON_PREFIXES].sort((a, b) => b.length - a.length);
    
    for (const prefix of sortedPrefixes) {
        if (digits.startsWith(prefix)) {
            return {
                countryCode: '+' + prefix,
                localNumber: digits.slice(prefix.length)
            };
        }
    }

    // Fallback if starts with + but no match
    return { countryCode: '', localNumber: digits };
};
