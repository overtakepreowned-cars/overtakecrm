import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';
import ApiLead from '../api/models/ApiLead.js';

dotenv.config();

async function checkDb(uri, label) {
    console.log(`\n=== Checking Database: ${label} ===`);
    try {
        const conn = await mongoose.createConnection(uri).asPromise();
        const LeadModel = conn.model('Lead', Lead.schema);
        const ApiLeadModel = conn.model('ApiLead', ApiLead.schema);
        
        console.log("Total leads in Lead collection:", await LeadModel.countDocuments());
        console.log("Total apiLeads in ApiLead collection:", await ApiLeadModel.countDocuments());
        
        const byPhoneBad = await LeadModel.findOne({ phone: '+915500000001' }).lean();
        console.log("Search by phone '+915500000001':", byPhoneBad);
        
        const byPhoneGood = await LeadModel.findOne({ phone: '+918000000001' }).lean();
        console.log("Search by phone '+918000000001':", byPhoneGood);
        
        const apiLeads = await ApiLeadModel.find({ name: /Webhook Test/i }).lean();
        console.log("Staged API Leads:", apiLeads);
        
        await conn.close();
    } catch (e) {
        console.error(`Failed to check ${label}:`, e.message);
    }
}

async function run() {
    // 1. Check Atlas (MONGO_URI)
    if (process.env.MONGO_URI) {
        await checkDb(process.env.MONGO_URI, 'MongoDB Atlas');
    } else {
        console.log("MONGO_URI not defined in .env");
    }
    
    // 2. Check Local MongoDB
    await checkDb('mongodb://localhost:27017/crm-demo', 'Local MongoDB');
    
    process.exit(0);
}
run().catch(console.error);
