export interface CountryConfig {
    name: string;
    code: string;
    iso: string;
    length: number | number[]; 
    flag: string;
}

export const COUNTRIES: CountryConfig[] = [
    { name: 'India', code: '+91', iso: 'IN', length: 10, flag: '🇮🇳' },
    { name: 'United Arab Emirates', code: '+971', iso: 'AE', length: 9, flag: '🇦🇪' },
    { name: 'Saudi Arabia', code: '+966', iso: 'SA', length: 9, flag: '🇸🇦' },
    { name: 'Qatar', code: '+974', iso: 'QA', length: 8, flag: '🇶🇦' },
    { name: 'Kuwait', code: '+965', iso: 'KW', length: 8, flag: '🇰🇼' },
    { name: 'Oman', code: '+968', iso: 'OM', length: 8, flag: '🇴🇲' },
    { name: 'Bahrain', code: '+973', iso: 'BH', length: 8, flag: '🇧🇭' },
    { name: 'Egypt', code: '+20', iso: 'EG', length: 10, flag: '🇪🇬' },
    { name: 'Jordan', code: '+962', iso: 'JO', length: 9, flag: '🇯🇴' },
    { name: 'Lebanon', code: '+961', iso: 'LB', length: 8, flag: '🇱🇧' },
    { name: 'Iraq', code: '+964', iso: 'IQ', length: 10, flag: '🇮🇶' },
    { name: 'Syria', code: '+963', iso: 'SY', length: 9, flag: '🇸🇾' },
    { name: 'Yemen', code: '+967', iso: 'YE', length: 9, flag: '🇾🇪' },
    { name: 'Palestine', code: '+970', iso: 'PS', length: 9, flag: '🇵🇸' },
    { name: 'Israel', code: '+972', iso: 'IL', length: 9, flag: '🇮🇱' },
    { name: 'Iran', code: '+98', iso: 'IR', length: 10, flag: '🇮🇷' },
    { name: 'Turkey', code: '+90', iso: 'TR', length: 10, flag: '🇹🇷' },
    { name: 'United States', code: '+1', iso: 'US', length: 10, flag: '🇺🇸' },
    { name: 'United Kingdom', code: '+44', iso: 'GB', length: 10, flag: '🇬🇧' },
    { name: 'Australia', code: '+61', iso: 'AU', length: 9, flag: '🇦🇺' },
    { name: 'Canada', code: '+1', iso: 'CA', length: 10, flag: '🇨🇦' },
    { name: 'Singapore', code: '+65', iso: 'SG', length: 8, flag: '🇸🇬' },
    { name: 'Malaysia', code: '+60', iso: 'MY', length: 9, flag: '🇲🇾' },
    { name: 'Germany', code: '+49', iso: 'DE', length: 11, flag: '🇩🇪' },
    { name: 'France', code: '+33', iso: 'FR', length: 9, flag: '🇫🇷' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India

export const parsePhoneNumber = (fullPhone: string): { countryCode: string; localNumber: string } => {
    if (!fullPhone) return { countryCode: '', localNumber: '' };

    // If it doesn't start with +, don't guess. Return as local number for manual selection.
    if (!fullPhone.startsWith('+')) {
        return { countryCode: '', localNumber: fullPhone.replace(/\D/g, '') };
    }

    // Find the matching country code
    // Sort by length descending to match longer codes first
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    
    for (const country of sortedCountries) {
        if (fullPhone.startsWith(country.code)) {
            return {
                countryCode: country.code,
                localNumber: fullPhone.slice(country.code.length)
            };
        }
    }

    // Fallback if it starts with + but doesn't match our list
    return { countryCode: '', localNumber: fullPhone };
};
