import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from '../api/models/Lead.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const leads = await Lead.find({}, 'phone').lean();
    
    const ccCounts = {};
    for (const lead of leads) {
        if (!lead.phone) continue;
        if (lead.phone.startsWith('+')) {
            // Find prefix
            const matched = ['+91', '+971', '+966', '+974', '+965', '+968', '+973', '+20', '+962', '+961', '+964', '+963', '+967', '+970', '+972', '+98', '+90', '+1', '+44'].find(p => lead.phone.startsWith(p));
            if (matched) {
                ccCounts[matched] = (ccCounts[matched] || 0) + 1;
            } else {
                ccCounts['other-plus'] = (ccCounts['other-plus'] || 0) + 1;
            }
        } else {
            ccCounts['no-plus'] = (ccCounts['no-plus'] || 0) + 1;
        }
    }
    
    console.log("Country Code Counts in CRM:", ccCounts);
    process.exit(0);
}
run().catch(console.error);
