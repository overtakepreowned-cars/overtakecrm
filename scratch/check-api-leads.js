import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const apiLeads = await ApiLead.find().lean();
    console.log("Staged API Leads count:", apiLeads.length);
    console.log("Staged API Leads:", JSON.stringify(apiLeads, null, 2));
    process.exit(0);
}
run().catch(console.error);
