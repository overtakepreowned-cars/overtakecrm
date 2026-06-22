import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';
import ApiLead from '../api/models/ApiLead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    console.log("Checking API Leads (ApiLead collection):");
    const apiLeads = await ApiLead.find({ name: /webhook/i }).lean();
    console.log(apiLeads);
    
    console.log("\nChecking Main CRM Leads (Lead collection):");
    const crmLeads = await Lead.find({ name: /webhook/i }).lean();
    console.log(crmLeads);
    
    process.exit(0);
}
run().catch(console.error);
