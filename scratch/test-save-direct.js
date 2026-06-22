import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log("Connected to DB");
    
    // Clean up
    await Lead.deleteOne({ phone: '+915500000001' });
    console.log("Deleted existing lead");

    const newLead = new Lead({
        name: 'webhook test bad',
        phone: '+915500000001'
    });
    
    try {
        const saved = await newLead.save();
        console.log("Save Succeeded:", saved);
    } catch (e) {
        console.error("Save Failed:", e);
    }
    
    await mongoose.connection.close();
}
run().catch(console.error);
