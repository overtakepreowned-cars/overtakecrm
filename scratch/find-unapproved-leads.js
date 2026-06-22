import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';
import * as phoneUtils from '../api/utils/phoneUtils.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    // Find all staged api leads
    const leads = await ApiLead.find().lean();
    console.log("Staged ApiLeads:", leads.length);
    
    for (const lead of leads) {
        const rawPhone = (lead.countryCode || '') + lead.phone;
        const validation = phoneUtils.validatePhoneNumber(rawPhone);
        console.log(`\nLead ID: ${lead._id}`);
        console.log(`- Name: ${lead.name}`);
        console.log(`- Phone: ${lead.phone} (CC: ${lead.countryCode})`);
        console.log(`- Validation isValid: ${validation.isValid} (Reason: ${validation.reason || 'None'})`);
        console.log(`- AssignedTo: ${lead.assignedTo}`);
    }
    
    await mongoose.connection.close();
}
run().catch(console.error);
