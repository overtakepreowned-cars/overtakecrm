import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo';

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
        
        // Find leads without a '+' prefix
        const leadsWithoutPrefix = await Lead.find({ phone: { $not: /^\+/ } });
        console.log(`Found ${leadsWithoutPrefix.length} leads without a '+' prefix.`);

        for (const lead of leadsWithoutPrefix) {
            console.log(`Lead: ${lead.name}, Phone: ${lead.phone}`);
            // Technically, they are already "None" in the new logic.
            // If the user wants to "update them as none", it might mean ensuring they are trimmed and cleaned.
            const cleanedPhone = lead.phone.trim().replace(/\s+/g, '');
            if (cleanedPhone !== lead.phone) {
                console.log(`Cleaning: ${lead.phone} -> ${cleanedPhone}`);
                await Lead.updateOne({ _id: lead._id }, { $set: { phone: cleanedPhone } });
            }
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

run();
