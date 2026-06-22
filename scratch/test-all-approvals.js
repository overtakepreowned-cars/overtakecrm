import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';
import Lead from '../api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const apiLeads = await ApiLead.find().lean();
    console.log("Total API Leads to test:", apiLeads.length);

    let passed = 0;
    let failed = 0;

    for (const stagedLead of apiLeads) {
        try {
            const fullPhone = (stagedLead.countryCode || '') + stagedLead.phone;
            const existingInCRM = await Lead.findOne({ phone: fullPhone.trim() });
            
            if (existingInCRM) {
                // Testing merge path validation
                // No new Lead is created, existingInCRM is saved.
                const incomingCars = stagedLead.carDetails || [];
                const tempLead = new Lead(existingInCRM.toObject ? existingInCRM.toObject() : existingInCRM);
                for (const incoming of incomingCars) {
                    const isDuplicate = tempLead.carDetails.some(existing =>
                        existing.intent === incoming.intent &&
                        (existing.wantedCar?.brandName || '') === (incoming.wantedCar?.brandName || '') &&
                        (existing.wantedCar?.modelName || '') === (incoming.wantedCar?.modelName || '') &&
                        (existing.ownedCar?.brandName || '') === (incoming.ownedCar?.brandName || '') &&
                        (existing.ownedCar?.modelName || '') === (incoming.ownedCar?.modelName || '')
                    );
                    if (!isDuplicate) {
                        tempLead.carDetails.push(incoming);
                    }
                }
                const existingNotes = new Set(tempLead.notes);
                for (const note of (stagedLead.notes || [])) {
                    if (!existingNotes.has(note)) {
                        tempLead.notes.push(note);
                    }
                }
                await tempLead.validate();
                passed++;
            } else {
                // Testing create path validation
                const leadData = { ...stagedLead };
                if (leadData.countryCode && leadData.phone) {
                    leadData.phone = `${leadData.countryCode}${leadData.phone}`;
                }
                delete leadData.countryCode;
                delete leadData._id;
                delete leadData.createdAt;
                delete leadData.updatedAt;
                delete leadData.existingInCrm;

                const newLead = new Lead(leadData);
                await newLead.validate();
                passed++;
            }
        } catch (err) {
            failed++;
            console.error(`FAILED: Lead ID ${stagedLead._id} (${stagedLead.name}, Phone: ${stagedLead.phone}):`, err.message);
        }
    }

    console.log(`Test complete. Passed: ${passed}, Failed: ${failed}`);
    process.exit(0);
}
run().catch(console.error);
