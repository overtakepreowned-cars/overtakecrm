import * as phoneUtils from '../api/utils/phoneUtils.js';

// Mocking the countries data from countries.ts
const COUNTRIES = [
    { name: 'None', code: '', iso: 'none', length: [5, 15], flag: '🌐' },
    { name: 'India', code: '+91', iso: 'IN', length: 10, flag: '🇮🇳' },
    { name: 'United Arab Emirates', code: '+971', iso: 'AE', length: 9, flag: '🇦🇪' }
];

const parsePhoneNumber = (fullPhone) => {
    if (!fullPhone) return { countryCode: '', localNumber: '' };
    if (!fullPhone.startsWith('+')) {
        return { countryCode: '', localNumber: fullPhone.replace(/\D/g, '') };
    }
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const country of sortedCountries) {
        if (fullPhone.startsWith(country.code)) {
            return {
                countryCode: country.code,
                localNumber: fullPhone.slice(country.code.length)
            };
        }
    }
    return { countryCode: '', localNumber: fullPhone.replace(/\D/g, '') };
};

function runValidation(lead) {
    const phoneVal = lead.phone || '';
    const { countryCode, localNumber } = parsePhoneNumber(phoneVal);
    const hasCC = !!countryCode;
    const hasAssignee = !!(lead.assignedTo);

    let phoneError = '';
    if (hasCC) {
        const country = COUNTRIES.find(c => c.code === countryCode);
        if (!country) {
            phoneError = 'Invalid country code';
        } else {
            const expected = country.length;
            const len = localNumber.length;
            if (Array.isArray(expected)) {
                if (len < expected[0] || len > expected[1]) {
                    phoneError = `Phone number must be between ${expected[0]} and ${expected[1]} digits for ${country.name}`;
                }
            } else {
                if (len !== expected) {
                    phoneError = `Phone number must be ${expected} digits for ${country.name}`;
                }
            }
        }
    }

    const isValidForSaving = hasCC && hasAssignee && !phoneError;

    let message = '';
    if (!isValidForSaving) {
        if (!hasCC && !hasAssignee) {
            message = 'Please add country code and assign a sales rep.';
        } else if (!hasCC && hasAssignee) {
            message = 'Please add country code.';
        } else if (hasCC && !hasAssignee) {
            message = 'Please assign a sales rep.';
        } else if (hasCC && hasAssignee && phoneError) {
            message = phoneError;
        }
    }

    return {
        isValidForSaving,
        message
    };
}

// Test cases
const testCases = [
    {
        name: "Test Case 1: Missing both country code and assignee",
        lead: { phone: "9876543210", assignedTo: null },
        expectedValid: false,
        expectedMsg: "Please add country code and assign a sales rep."
    },
    {
        name: "Test Case 2: Missing country code only",
        lead: { phone: "9876543210", assignedTo: "user123" },
        expectedValid: false,
        expectedMsg: "Please add country code."
    },
    {
        name: "Test Case 3: Missing assignee only",
        lead: { phone: "+919876543210", assignedTo: null },
        expectedValid: false,
        expectedMsg: "Please assign a sales rep."
    },
    {
        name: "Test Case 4: Invalid phone length with country code",
        lead: { phone: "+9198765432", assignedTo: "user123" }, // 8 digits instead of 10
        expectedValid: false,
        expectedMsg: "Phone number must be 10 digits for India"
    },
    {
        name: "Test Case 5: Fully valid lead",
        lead: { phone: "+919876543210", assignedTo: "user123" },
        expectedValid: true,
        expectedMsg: ""
    }
];

let failed = false;
for (const tc of testCases) {
    const res = runValidation(tc.lead);
    const validPassed = res.isValidForSaving === tc.expectedValid;
    const msgPassed = res.message === tc.expectedMsg;
    if (validPassed && msgPassed) {
        console.log(`PASS: ${tc.name}`);
    } else {
        console.error(`FAIL: ${tc.name}`);
        console.error(`  Expected: valid=${tc.expectedValid}, msg="${tc.expectedMsg}"`);
        console.error(`  Got:      valid=${res.isValidForSaving}, msg="${res.message}"`);
        failed = true;
    }
}

if (!failed) {
    console.log("\nALL UI VALIDATION TESTS PASSED!");
    process.exit(0);
} else {
    process.exit(1);
}
