import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log("Connected to DB");

    const rawCol = mongoose.connection.db.collection('apileads');
    
    // Find documents where assignedTo is empty string using raw MongoDB driver
    const countEmptyRaw = await rawCol.countDocuments({ assignedTo: "" });
    console.log("Raw query: count of apileads with assignedTo === \"\":", countEmptyRaw);
    
    const countNullRaw = await rawCol.countDocuments({ assignedTo: null });
    console.log("Raw query: count of apileads with assignedTo === null:", countNullRaw);
    
    const countUndefinedRaw = await rawCol.countDocuments({ assignedTo: { $exists: false } });
    console.log("Raw query: count of apileads with assignedTo not existing:", countUndefinedRaw);
    
    const samples = await rawCol.find({ assignedTo: "" }).limit(3).toArray();
    console.log("Samples with assignedTo === \"\":", samples);

    await mongoose.connection.close();
}
run().catch(console.error);
