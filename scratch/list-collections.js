import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    console.log("Connected to DB:", mongoose.connection.name);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\nCollections and Document Counts:");
    for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`- ${col.name}: ${count} documents`);
    }
    
    console.log("\nSearching 'leads' collection directly by query phone '+915500000001':");
    const rawLeadBad = await mongoose.connection.db.collection('leads').findOne({ phone: '+915500000001' });
    console.log(rawLeadBad);

    console.log("\nSearching 'leads' collection directly by query phone '+918000000001':");
    const rawLeadGood = await mongoose.connection.db.collection('leads').findOne({ phone: '+918000000001' });
    console.log(rawLeadGood);

    console.log("\nSearching 'leads' collection directly for name 'webhook test':");
    const rawLeadsList = await mongoose.connection.db.collection('leads').find({ name: /webhook test/i }).toArray();
    console.log(rawLeadsList);

    await mongoose.connection.close();
}
run().catch(console.error);
