import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from './api/models/Lead.js';
import User from './api/models/User.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const users = await User.find().lean();
    if (users.length === 0) return console.log("no users");
    const user = users[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lead = new Lead({
        name: 'Test Lead',
        phone: '1234567890',
        assignedTo: user._id,
        status: 'contacted',
        followupDate: today,
        followupHistory: [{
            userId: user._id,
            scheduledDate: today,
            completedDate: new Date(),
            result: 'responded'
        }]
    });
    await lead.save();
    console.log("Saved test lead");
    process.exit(0);
}
run().catch(console.error);
