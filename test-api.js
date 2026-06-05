import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lead from './api/models/Lead.js';
import User from './api/models/User.js';

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-demo');
    const date = '2026-06-05';
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("selectedDate:", selectedDate);
    console.log("nextDay:", nextDay);
    console.log("today:", today);

    const allUsers = await User.find({}, 'username role').lean();

    const dailyPending = await Lead.aggregate([
        {
            $match: {
                followupDate: { $gte: selectedDate, $lt: nextDay },
                status: { $nin: ['booking_confirmed', 'deal_closed'] }
            }
        },
        {
            $group: {
                _id: "$assignedTo",
                pendingCount: { $sum: 1 }
            }
        }
    ]);
    console.log("dailyPending:", dailyPending);

    process.exit(0);
}
run().catch(console.error);
