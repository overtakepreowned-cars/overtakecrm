import Lead from '../models/Lead.js';
import ApiLead from '../models/ApiLead.js';

export const captureWebhookLead = async (req, res, next) => {
    try {
        const { leadOrigin, leadinfo } = req.body;
        
        if (!leadinfo) {
             return res.status(400).json({ message: 'leadinfo object is required for webhook submission.' });
        }

        const name = leadinfo.first_name || leadinfo.name;
        
        let rawPhone = leadinfo.whatsapp_phone ? String(leadinfo.whatsapp_phone).trim() : (leadinfo.phone ? String(leadinfo.phone).trim() : '');
        let phone = null;
        let detectedCountryCode = '';
        if (rawPhone) {
            let digits = rawPhone.replace(/\D/g, '');
            const hasInitialPlus = rawPhone.trim().startsWith('+');
            
            // List of common country prefixes to check if number starts with them but lacks '+'
            const commonPrefixes = ['91', '971', '966', '974', '965', '968', '973', '20', '962', '961', '964', '963', '967', '970', '972', '98', '90', '1', '44'];
            
            if (hasInitialPlus) {
                // If it already has a +, find the matching prefix to store separately
                const matched = commonPrefixes.find(p => digits.startsWith(p));
                if (matched) {
                    detectedCountryCode = '+' + matched;
                    phone = digits.slice(matched.length);
                } else {
                    phone = digits;
                }
            } else {
                let detected = false;
                for (const prefix of commonPrefixes) {
                    if (digits.startsWith(prefix) && digits.length > 8) {
                        detectedCountryCode = '+' + prefix;
                        phone = digits.slice(prefix.length);
                        detected = true;
                        break;
                    }
                }
                
                if (!detected) {
                    phone = digits;
                }
            }
        }
        
        if (!name || !phone) {
            return res.status(400).json({ message: 'Name and phone inside leadinfo are required.' });
        }

        const existingMainLead = await Lead.findOne({ phone: phone.trim() });
        const existingInCrm = !!existingMainLead;

        const validOrigins = ['whatsapp', 'insta', 'fb', 'walk-in', 'tele', 'referral', 'web', 'olx', 'other'];
        let finalOrigin = (leadOrigin || leadinfo.leadOrigin || 'other').toLowerCase();
        if (!validOrigins.includes(finalOrigin)) {
            finalOrigin = 'other';
        }

        const carDetailsArray = [];
        const custom = leadinfo.custom_fields || {};
        const intent = custom.intention ? custom.intention.toLowerCase() : null;
        
        if (intent === 'buying' || intent === 'selling' || intent === 'exchange') {
            const carDetail = { intent };
            if (intent === 'buying') {
                carDetail.wantedCar = { brandName: custom['buy brand'], modelName: custom['buy model'] };
            } else if (intent === 'selling') {
                carDetail.ownedCar = { brandName: custom['sell brand'], modelName: custom['sell model'], year: custom['sell model year'], kmDriven: custom['sell model km'] };
            } else if (intent === 'exchange') {
                carDetail.ownedCar = { brandName: custom['exchange car brand owning'], modelName: custom['exchange car model owning'] };
                carDetail.wantedCar = { brandName: custom['exchange car brand looking'], modelName: custom['exchange car model looking'] };
            }
            carDetailsArray.push(carDetail);
        }

        const notesArray = [];
        if (custom.Note) notesArray.push(custom.Note);

        const existingApiLead = await ApiLead.findOne({ phone: phone.trim() });
        if (existingApiLead) {
            for (const incoming of carDetailsArray) {
                const isDuplicate = existingApiLead.carDetails.some(existing =>
                    existing.intent === incoming.intent &&
                    (existing.wantedCar?.brandName || '') === (incoming.wantedCar?.brandName || '') &&
                    (existing.wantedCar?.modelName || '') === (incoming.wantedCar?.modelName || '') &&
                    (existing.ownedCar?.brandName || '') === (incoming.ownedCar?.brandName || '') &&
                    (existing.ownedCar?.modelName || '') === (incoming.ownedCar?.modelName || '')
                );
                if (!isDuplicate) {
                    existingApiLead.carDetails.push(incoming);
                }
            }

            const existingNotes = new Set(existingApiLead.notes);
            for (const note of notesArray) {
                if (!existingNotes.has(note)) {
                    existingApiLead.notes.push(note);
                }
            }

            existingApiLead.existingInCrm = existingInCrm;
            await existingApiLead.save();

            return res.status(200).json({
                status: 'success',
                message: 'API Lead updated with new details.',
                data: {
                    id: existingApiLead._id,
                    name: existingApiLead.name,
                    phone: existingApiLead.phone,
                    leadOrigin: existingApiLead.leadOrigin,
                    existingInCrm,
                    vehiclesEnquired: existingApiLead.carDetails.length
                }
            });
        }

        const leadData = {
           name: name.trim(),
           phone: phone.trim(),
           countryCode: detectedCountryCode,
           leadOrigin: finalOrigin,
           notes: notesArray,
           carDetails: carDetailsArray,
           existingInCrm
        };

        const apiLead = new ApiLead(leadData);
        await apiLead.save();

        res.status(201).json({
            status: 'success',
            message: existingInCrm
                ? 'Lead captured. This phone already exists in CRM — will merge on approval.'
                : 'Lead successfully captured and staged via webhook.',
            data: {
                id: apiLead._id,
                name: apiLead.name,
                phone: apiLead.phone,
                leadOrigin: apiLead.leadOrigin,
                existingInCrm,
                vehiclesEnquired: apiLead.carDetails.length
            }
        });
    } catch (error) { next(error); }
};
