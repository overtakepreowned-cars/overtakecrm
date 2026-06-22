import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ApiLead from '../api/models/ApiLead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    
    const countEmptyString = await ApiLead.countDocuments({ assignedTo: "" });
    console.log("Staged API leads with assignedTo as empty string:", countEmptyString);
    
    const countNull = await ApiLead.countDocuments({ assignedTo: null });
    console.log("Staged API leads with assignedTo as null:", countNull);
    
    const countExists = await ApiLead.countDocuments({ assignedTo: { $exists: true } });
    console.log("Staged API leads with assignedTo field existing:", countExists);

    const firstExists = await ApiLead.findOne({ assignedTo: { $exists: true } }).lean();
    console.log("First lead with assignedTo field:", firstExists);
    
    await mongoose.connection.close();
}
run().catch(console.error);
