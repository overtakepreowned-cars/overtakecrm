import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function testConnection() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected successfully!');
        
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases available:', dbs.databases.map(db => db.name));

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'local', 'config'].includes(dbName)) continue;
            
            console.log(`\nChecking database: ${dbName}`);
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            console.log(`Collections in ${dbName}:`, collections.map(c => c.name));
            
            if (collections.some(c => c.name === 'leads')) {
                const count = await db.db.collection('leads').countDocuments();
                console.log(`Leads in ${dbName}:`, count);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

testConnection();
