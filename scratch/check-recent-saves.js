import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    console.log("Searching for leads created after:", thirtyMinutesAgo.toISOString());
    
    const recentLeads = await Lead.find({
        createdAt: { $gte: thirtyMinutesAgo }
    }).lean();
    
    console.log("Recent leads found:", recentLeads);
    
    await mongoose.connection.close();
}
run().catch(console.error);
