import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo';

async function testDB() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    const LeadSchema = new mongoose.Schema({}, { strict: false });
    const Lead = mongoose.model('Lead', LeadSchema, 'leads');

    const totalLeads = await Lead.countDocuments({});
    console.log(`Total Leads in DB: ${totalLeads}`);

    // Sample 1 lead
    const sample = await Lead.findOne({});
    console.log('Sample Lead:', sample);

    await mongoose.disconnect();
}

testDB().catch(console.error);
