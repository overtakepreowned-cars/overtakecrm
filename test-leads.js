import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from './api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const leads = await Lead.countDocuments();
    const leadsWithFollowupHistory = await Lead.countDocuments({ followupHistory: { $not: { $size: 0 } } });
    console.log("Total leads:", leads);
    console.log("Leads with followup history:", leadsWithFollowupHistory);
    process.exit(0);
}
run().catch(console.error);
