import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';
import Lead from '../api/models/Lead.js';
import * as phoneUtils from '../api/utils/phoneUtils.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    try {
        const stagedLead = await ApiLead.findById("6a38cc17c5322d443652487a").lean();
        if (!stagedLead) {
            console.log('Lead not found!');
            process.exit(0);
        }

        const rawPhone = (stagedLead.countryCode || '') + stagedLead.phone;
        const phoneValidation = phoneUtils.validatePhoneNumber(rawPhone);
        if (!phoneValidation.isValid) {
            throw new Error(`Cannot approve lead: ${phoneValidation.reason}`);
        }
        const normalizedPhone = phoneValidation.normalized;

        const existingInCRM = await Lead.findOne({ phone: normalizedPhone });
        if (existingInCRM) {
            console.log('Exists in CRM, merging...');
        } else {
            console.log('Does not exist in CRM, saving new...');
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
            console.log('Successfully saved new lead!');
        }
    } catch (err) {
        console.error('ERROR DURING SAVE:', err);
    }
    
    await mongoose.connection.close();
}
run().catch(console.error);
