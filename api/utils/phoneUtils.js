// Standard country prefixes for matching
export const COMMON_PREFIXES = ['91', '971', '966', '974', '965', '968', '973', '20', '962', '961', '964', '963', '967', '970', '972', '98', '90', '1', '44'];

/**
 * Parses a phone number and extracts country code and local number.
 * Handles cases with and without '+' prefix.
 */
export const parsePhoneNumber = (fullPhone, forcedCountryCode = null) => {
    if (!fullPhone) return { countryCode: '', localNumber: '' };

    let cleanPhone = String(fullPhone).replace(/\D/g, '');
    
    // If a country code is forced, use it
    if (forcedCountryCode) {
        let cleanCC = String(forcedCountryCode).replace(/\D/g, '');
        // If the phone already starts with the forced CC, don't duplicate it
        if (cleanPhone.startsWith(cleanCC) && cleanPhone.length > cleanCC.length) {
            return { countryCode: '+' + cleanCC, localNumber: cleanPhone.slice(cleanCC.length) };
        }
        return { countryCode: '+' + cleanCC, localNumber: cleanPhone };
    }

    // Handle '+' prefix
    if (String(fullPhone).startsWith('+')) {
        const sortedPrefixes = [...COMMON_PREFIXES].sort((a, b) => b.length - a.length);
        for (const prefix of sortedPrefixes) {
            if (cleanPhone.startsWith(prefix)) {
                return {
                    countryCode: '+' + prefix,
                    localNumber: cleanPhone.slice(prefix.length)
                };
            }
        }
        return { countryCode: '', localNumber: cleanPhone };
    }

    // If no '+' but starts with common prefix, try to guess (careful here)
    // For simplicity, we'll assume no CC if no '+' unless forced.
    return { countryCode: '', localNumber: cleanPhone };
};

/**
 * Validates a phone number.
 * A valid number should have a country code and a local number of 7-12 digits.
 */
export const validatePhoneNumber = (phone, countryCode = null) => {
    if (!phone) return { isValid: false, reason: 'Phone number is required' };
    
    const { countryCode: cc, localNumber } = parsePhoneNumber(phone, countryCode);
    
    if (!cc && !countryCode) {
        return { isValid: false, reason: 'Country code is missing' };
    }
    
    if (localNumber.length < 7 || localNumber.length > 12) {
        return { isValid: false, reason: 'Phone number should be between 7 and 12 digits' };
    }
    
    return { isValid: true, normalized: `${cc || countryCode}${localNumber}` };
};
