import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';
import ApiLead from '../api/models/ApiLead.js';
import User from '../api/models/User.js';
import Tag from '../api/models/Tag.js';
import * as phoneUtils from '../api/utils/phoneUtils.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log("Connected to Database");

    const browserLeads = await ApiLead.find({ name: /browser/i }).lean();
    console.log("Staged API Leads with 'browser' in name:", browserLeads.length);

    for (const stagedLead of browserLeads) {
        console.log(`\nApproving Lead: ${stagedLead.name}`);
        const rawPhone = (stagedLead.countryCode || '') + stagedLead.phone;
        const phoneValidation = phoneUtils.validatePhoneNumber(rawPhone);
        if (!phoneValidation.isValid) {
            console.log(`- Skipping ${stagedLead.name}: Phone validation failed: ${phoneValidation.reason}`);
            continue;
        }
        const normalizedPhone = phoneValidation.normalized;

        const existingInCRM = await Lead.findOne({ phone: normalizedPhone });
        if (existingInCRM) {
            console.log(`- Merging with existing CRM Lead: ${existingInCRM.name}`);
            const incomingCars = stagedLead.carDetails || [];
            for (const incoming of incomingCars) {
                const isDuplicate = existingInCRM.carDetails.some(existing =>
                    existing.intent === incoming.intent &&
                    (existing.wantedCar?.brandName || '') === (incoming.wantedCar?.brandName || '') &&
                    (existing.wantedCar?.modelName || '') === (incoming.wantedCar?.modelName || '') &&
                    (existing.ownedCar?.brandName || '') === (incoming.ownedCar?.brandName || '') &&
                    (existing.ownedCar?.modelName || '') === (incoming.ownedCar?.modelName || '')
                );
                if (!isDuplicate) {
                    existingInCRM.carDetails.push(incoming);
                }
            }

            const existingNotes = new Set(existingInCRM.notes);
            for (const note of (stagedLead.notes || [])) {
                if (!existingNotes.has(note)) {
                    existingInCRM.notes.push(note);
                }
            }

            existingInCRM.phone = normalizedPhone;
            if (stagedLead.assignedTo) {
                existingInCRM.assignedTo = stagedLead.assignedTo;
            }
            await existingInCRM.save();
            await ApiLead.findByIdAndDelete(stagedLead._id);
            console.log(`- Successfully merged and deleted staged lead.`);
        } else {
            console.log(`- Creating new CRM Lead...`);
            const leadData = { ...stagedLead };
            if (leadData.assignedTo === '' || leadData.assignedTo === null) {
                leadData.assignedTo = null;
            }
            leadData.phone = normalizedPhone;
            delete leadData.countryCode;
            delete leadData._id;
            delete leadData.createdAt;
            delete leadData.updatedAt;
            delete leadData.existingInCrm;

            const newLead = new Lead(leadData);
            await newLead.save();
            await ApiLead.findByIdAndDelete(stagedLead._id);
            console.log(`- Successfully approved new lead and deleted staged lead.`);
        }
    }

    await mongoose.connection.close();
    console.log("\nDone!");
}
run().catch(console.error);
