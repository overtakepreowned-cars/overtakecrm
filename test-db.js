import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from './api/models/Lead.js';
import User from './api/models/User.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const users = await User.find({}, 'username role').lean();
    console.log("Users:", users.length);
    
    const lead = await Lead.findOne({ "followupHistory.0": { $exists: true } }).select("followupHistory followupDate").lean();
    console.log("Sample Lead with followup:", JSON.stringify(lead, null, 2));

    process.exit(0);
}
run().catch(console.error);
