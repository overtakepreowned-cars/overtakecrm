import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const apiLeads = await ApiLead.find().lean();
    
    console.log("Staged API Leads formats:");
    const emptyCC = [];
    const withCC = [];
    for (const lead of apiLeads) {
        if (!lead.countryCode) {
            emptyCC.push({ id: lead._id, name: lead.name, phone: lead.phone, countryCode: lead.countryCode });
        } else {
            withCC.push({ id: lead._id, name: lead.name, phone: lead.phone, countryCode: lead.countryCode });
        }
    }
    
    console.log(`With Country Code: ${withCC.length}, Without Country Code: ${emptyCC.length}`);
    if (emptyCC.length > 0) {
        console.log("Sample without country code:", emptyCC.slice(0, 10));
    }
    
    process.exit(0);
}
run().catch(console.error);
