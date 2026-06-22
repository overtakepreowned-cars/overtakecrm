import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    console.log("Total leads in CRM:", await Lead.countDocuments());
    
    const byIdLead = await Lead.findById('6a38d65f00ee83f55c063d5b').lean();
    console.log("Search in Lead by ID:", byIdLead);
    
    const byIdApiLead = await ApiLead.findById('6a38d65f00ee83f55c063d5b').lean();
    console.log("Search in ApiLead by ID:", byIdApiLead);
    
    const lastLeads = await Lead.find().sort({ createdAt: -1 }).limit(5).lean();
    console.log("Last 5 created leads in CRM:", lastLeads);
    
    process.exit(0);
}
run().catch(console.error);
