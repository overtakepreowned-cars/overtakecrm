import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo';

import '../api/models/User.js';
import { getLeads } from '../api/controllers/leadsController.js';

async function testApi() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected!');

    // Mock Express req, res
    const req = {
        query: {
            page: '0',
            limit: '20',
            search: ''
        }
    };

    const res = {
        json: (data) => {
            console.log('API Response received:');
            console.log('Type of response:', Array.isArray(data) ? 'Array' : typeof data);
            if (Array.isArray(data)) {
                console.log('Array length:', data.length);
            } else {
                console.log('Keys:', Object.keys(data));
                console.log('Total:', data.total);
                console.log('Leads length:', data.leads?.length);
            }
        }
    };

    const next = (err) => {
        console.error('API Error:', err);
    };

    await getLeads(req, res, next);

    await mongoose.disconnect();
}

testApi().catch(console.error);
