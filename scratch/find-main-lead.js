import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    // Find lead named webhook card validation
    const leads = await Lead.find({ name: /webhook/i }).lean();
    console.log("Found Webhook Leads in Main CRM:", leads.length);
    
    for (const lead of leads) {
        console.log(`\nLead ID: ${lead._id}`);
        console.log(`- Name: ${lead.name}`);
        console.log(`- Phone: ${lead.phone}`);
        console.log(`- AssignedTo: ${lead.assignedTo}`);
    }
    
    await mongoose.connection.close();
}
run().catch(console.error);
