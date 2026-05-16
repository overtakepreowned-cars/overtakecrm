import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
console.log('Testing connection to:', MONGO_URI);

async function testConnection() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected successfully!');
        
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections found:', collections.map(c => c.name));
        
        // Count documents in leads
        const leadsCount = await mongoose.connection.db.collection('leads').countDocuments();
        console.log('Number of leads:', leadsCount);

        // Count documents in api-leads
        const apiLeadsCount = await mongoose.connection.db.collection('apileads').countDocuments();
        console.log('Number of api-leads:', apiLeadsCount);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

testConnection();
