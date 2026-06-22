import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';
import * as phoneUtils from '../api/utils/phoneUtils.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    const apiLeads = await ApiLead.find().lean();
    console.log("Total ApiLeads:", apiLeads.length);
    
    let missingCC = 0;
    let invalidLength = 0;
    let valid = 0;
    
    const invalidSamples = [];
    
    for (const lead of apiLeads) {
        const rawPhone = (lead.countryCode || '') + lead.phone;
        const validation = phoneUtils.validatePhoneNumber(rawPhone);
        if (!validation.isValid) {
            if (validation.reason.includes('Country code')) {
                missingCC++;
            } else {
                invalidLength++;
            }
            if (invalidSamples.length < 5) {
                invalidSamples.push({
                    id: lead._id,
                    name: lead.name,
                    phone: lead.phone,
                    countryCode: lead.countryCode,
                    reason: validation.reason
                });
            }
        } else {
            valid++;
        }
    }
    
    console.log("\nStatistics:");
    console.log(`- Valid for approval: ${valid}`);
    console.log(`- Missing country code: ${missingCC}`);
    console.log(`- Invalid phone length: ${invalidLength}`);
    
    console.log("\nSamples of invalid leads:", invalidSamples);
    
    await mongoose.connection.close();
}
run().catch(console.error);
